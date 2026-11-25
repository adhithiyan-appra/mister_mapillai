/**
 * Frame store and renderer for the hero sequence. DOM-free, so the same code
 * runs in a worker on an OffscreenCanvas (the normal path) or on the page's
 * own canvas (fallback for browsers without OffscreenCanvas).
 *
 * Measured bottlenecks this design removes (Chrome, real GPU, 1440×900):
 * - drawImage(<img>) re-decoded each 1920×1088 frame synchronously on the
 *   main thread at draw time (~30 ms per frame): frames are now decoded ahead,
 *   off the main thread, at exactly the drawn size.
 * - decoding on the page's thread froze the picture whenever the page was busy. The frames
 *   are lossless WebP (VP8L), for which createImageBitmap(blob) is the right decoder:
 *   measured on a 12-core machine at 1920×1088 it manages ~27 frames/s on one decode at
 *   a time and ~70 at four, whereas the WebCodecs ImageDecoder route that suited the old
 *   lossy (YUV) frames costs twice as much per frame on lossless ones (13 and 62 frames/s).
 *   Decodes run several at once, in the worker, so throughput scales with the cores.
 * - drawing a CPU bitmap into an accelerated canvas uploads it to the GPU at
 *   draw time (~11 ms per frame on the main thread): in the worker path that
 *   upload happens on the worker, so the page's main thread does no image work.
 * - the frame to show was chosen on the main thread, so any main-thread hitch
 *   froze the picture. The renderer now owns a playhead that glides toward the
 *   scroll position on its own clock (the worker's rAF), at a speed the decoded
 *   frames can sustain, so it never skips ahead of what is ready.
 */

export interface RenderProfile {
  fetchConcurrency: number;
  /**
   * Encoded frames fetched beyond the decoded window, in the scroll direction. The frames are lossless (~0.85 MB each), so
   * only the frames around the scroll position are ever fetched, never the whole sequence.
   */
  prefetch: number;
  /** Encoded frames retained behind the decoded window so reverse scrolling decodes immediately without network re-fetches. */
  prefetchBehind: number;
  /** Frames after the opening ones that are fetched while the page is idle, before the visitor has scrolled (0: none). */
  warm: number;
  decodeConcurrency: number;
  /** Decoded window around the current frame, in the scroll direction and behind it. */
  ahead: number;
  behind: number;
  /** Decoded frames required at the start of a stage before its clock may run. */
  startBuffer: number;
  /** Fastest the playhead travels, in frames per second (the sequence never plays faster than this). */
  maxSpeed: number;
  /** How far the playhead trails a steadily moving scroll position, in seconds (its response time). */
  glide: number;
}

/** Canvas size and where (and at what size) frames are drawn, in device pixels. */
export interface RenderLayout {
  canvasWidth: number;
  canvasHeight: number;
  x: number;
  y: number;
  w: number;
  h: number;
  /** The frame covers the whole canvas (no letterbox to paint). */
  cover: boolean;
}

/** Frame 1 from the page (the poster): an element on the main thread, a bitmap in the worker. null = fetch it. */
export type FirstFrame = ImageBitmap | HTMLImageElement | null;

/** First pause before a failed frame is tried again (ms); it doubles up to MAX_RETRY_MS. */
const RETRY_MS = 600;
const MAX_RETRY_MS = 30_000;
const ENCODED_CACHE = 'mm-hero-encoded-frames';
const HASHED_FRAME = /\/assets\/frame-\d+-[^/]+\.webp$/;

/** The final group is pinned before the stage starts, even if it is outside the rolling decode window. */
const TAIL_FRAMES = 5;
type StageRange = [from: number, to: number];

interface Frame {
  url: string;
  /** Encoded file, kept only while the frame is near the playhead (or a keyframe): lossless frames are ~0.85 MB each. */
  blob?: Blob;
  fetching: boolean;
  /** The request in flight, and whether it was cancelled because the playhead moved away (not a failure). */
  controller?: AbortController;
  cancelled?: boolean;
  /** Failed attempts (download or decode) since the frame last succeeded, and when the next attempt may start. */
  retries: number;
  retryAt?: number;
  /** Original-resolution decoded pixels. Only a bounded window is kept. */
  bitmap?: ImageBitmap;
  decoding: boolean;
}

/**
 * Fetches the frames around the scroll position (identical files share one request) and keeps a bounded set of them:
 * a few encoded files ahead of the playhead, a window of frames decoded around it and sparse keyframes across the
 * sequence. Nothing is fetched until the visitor scrolls, apart from the opening frames and a short warm-up while idle;
 * a request the playhead has moved away from is cancelled and an encoded file that leaves the set is dropped (the
 * browser's cache serves it again if the visitor scrolls back). Decoding runs off the main thread; frames leaving the
 * decoded set are released with ImageBitmap.close().
 */
export class FrameStore {
  /** Position in the sequence → unique frame (the footage repeats a few frames). */
  private readonly unique: number[] = [];
  private readonly frames: Frame[] = [];
  /** The visitor has scrolled into the sequence: fetch around the playhead, not just the opening frames. */
  private engaged = false;
  /** The page has finished loading its own resources: the idle warm-up may start (see allowWarm). */
  private warmAllowed = false;
  private fetching = 0;
  private decoding = 0;
  private focusAt = 0;
  /** The window's centre when the plan was last made (see centre()). */
  private lastCentre = -1;
  /** False right after the playhead was moved straight to the scroll position: the window is then centred on it, not on the last decoded frame. */
  private sequential = true;
  private direction = 1;
  private disposed = false;
  private wanted = new Set<number>();
  /** undefined: not provided yet (wait); null: fetch frame 1 like the others. */
  private first: FirstFrame | undefined;
  /** The hero is off screen: keep the poster and the exact frame on the canvas. */
  private resting = false;
  private stage: StageRange | null = null;
  private previous: StageRange | null = null;
  private upcoming: StageRange[] = [];
  private retryTimer = 0;
  private cache: Promise<Cache | undefined> | undefined;

  constructor(
    urls: readonly string[],
    private readonly profile: RenderProfile,
    /** Called with a sequence position whenever its frame becomes drawable. */
    private readonly onFrame: (position: number) => void,
    /** Encoded data arrived, so a stage waiting for its download buffer may be ready. */
    private readonly onDownload: () => void,
  ) {
    const byUrl = new Map<string, number>();
    urls.forEach(url => {
      let u = byUrl.get(url);
      if (u === undefined) {
        u = this.frames.length;
        byUrl.set(url, u);
        this.frames.push({ url, fetching: false, retries: 0, decoding: false });
      }
      this.unique.push(u);
    });
    this.updateWanted();
    // Back online after an outage: reset retry delays (worker and page scopes both fire 'online').
    globalThis.addEventListener?.('online', this.reconnected);
  }

  private readonly reconnected = () => {
    this.frames.forEach(frame => { if (frame.retries) { frame.retries = 0; frame.retryAt = 0; } });
    this.pump();
  };

  /** Number of positions in the sequence. */
  get length() { return this.unique.length; }

  get isResting() { return this.resting; }

  /** The hero is off screen: release the rolling window until `focus` is called again. */
  rest() {
    if (this.resting) return;
    this.resting = true;
    this.lastCentre = -1;
    this.pump();
  }

  /** The visible poster is frame 1: decoded from it instead of being fetched twice. */
  provideFirst(first: FirstFrame) {
    if (this.disposed) { if (first && 'close' in first) first.close(); return; }
    this.first = first;
    this.pump();
  }

  /**
   * Distance from `position` back (against `direction`) to the nearest decoded frame, looking at most `limit` frames;
   * Infinity if there is none that close.
   */
  decodedGap(position: number, direction: number, limit: number): number {
    const n = this.unique.length;
    for (let d = 0; d <= limit; d++) {
      const p = position - d * direction;
      if (p < 0 || p >= n) break;
      if (this.frames[this.unique[p]].bitmap) return d;
    }
    return Infinity;
  }

  /**
   * The playhead is already as far past the decoded frames as the window reaches: it should wait for the frames behind it to
   * arrive instead of creeping on. (A playhead that outruns a slow connection would leave the frames being fetched behind it,
   * show the same old frame for seconds and then jump; waiting shows every frame, in order, at the pace they arrive.) A playhead
   * far from any decoded frame has just jumped (a scroll jump, an anchor): it is not held back, so it can travel to the new place.
   */
  shouldWait(position: number, direction: number): boolean {
    if (!this.sequential) return false;
    const { ahead } = this.profile;
    const gap = this.decodedGap(position, direction, 3 * ahead);
    return gap >= ahead && gap !== Infinity;
  }

  /**
   * Where the fetching and decoding window is centred: on the playhead's frame, or, while the playhead is ahead of frames that
   * have not arrived yet, on the last decoded frame behind it, so the next missing frame is always the next one fetched.
   */
  private centre(): number {
    if (!this.sequential) return this.focusAt;
    const gap = this.decodedGap(this.focusAt, this.direction, 3 * this.profile.ahead);
    return gap === Infinity ? this.focusAt : this.focusAt - gap * this.direction;
  }

  /** The playhead was moved straight to the scroll position: fetch around it until frames there have arrived. */
  jumped() { this.sequential = false; this.lastCentre = -1; }

  /** Re-prioritise around the frame being shown and the scroll direction. */
  focus(position: number, direction: number) {
    const turned = direction !== 0 && Math.sign(direction) !== this.direction;
    const woke = this.resting;
    this.resting = false;
    if (position === this.focusAt && !turned && !woke) return;
    this.focusAt = position;
    if (direction) this.direction = Math.sign(direction);
    if (turned || woke) this.lastCentre = -1;
    this.pump();
  }

  beginStage(from: number, to: number) {
    this.stage = [from, to];
    this.engaged = true;
    this.lastCentre = -1;
    this.focus(from, to >= from ? 1 : -1);
    this.pump();
  }

  finishStage() {
    this.previous = this.stage;
    this.stage = null;
    this.lastCentre = -1;
  }

  /** Predict the most likely next stage and keep a short runway for its opposite. */
  setUpcoming(ranges: StageRange[]) {
    this.upcoming = ranges;
    this.lastCentre = -1;
    this.pump();
  }

  /**
   * Stage bytes stay resident through playback. Decode the opening runway and ending group in advance, then decode the middle
   * through a rolling window. A late network response can delay a cold stage start, but cannot stall its ending.
   */
  stageReady(from: number, to: number): boolean {
    const dir = to >= from ? 1 : -1, n = Math.abs(to - from);
    const buffered = Math.min(n, Math.max(0, this.profile.startBuffer - 1));
    if (!this.decodedBetween(from, from + dir * buffered)
      || !this.decodedBetween(to - dir * Math.min(n, TAIL_FRAMES - 1), to)) return false;
    for (let d = buffered + 1; d <= n; d++) {
      const frame = this.frames[this.unique[from + dir * d]];
      if (!frame.blob && !(this.unique[from + dir * d] === 0 && this.first)) return false;
    }
    return true;
  }

  /**
   * Every frame from `a` to `b` (either order) has an original-resolution bitmap.
   */
  decodedBetween(a: number, b: number): boolean {
    const dir = b >= a ? 1 : -1;
    for (let p = a; ; p += dir) {
      const frame = this.frames[this.unique[p]];
      if (frame && !frame.bitmap) return false;
      if (p === b) return true;
    }
  }

  /** The decoded frame at exactly `position`, or null. */
  exact(position: number): { position: number; bitmap: ImageBitmap } | null {
    const frame = position >= 0 && position < this.unique.length ? this.frames[this.unique[position]] : undefined;
    return frame?.bitmap ? { position, bitmap: frame.bitmap } : null;
  }

  /** The decoded frame closest to `position`, preferring the side already scrolled past. */
  nearest(position: number): { position: number; bitmap: ImageBitmap } | null {
    const n = this.unique.length;
    const pick = (p: number) => {
      const frame = p >= 0 && p < n ? this.frames[this.unique[p]] : undefined;
      return frame?.bitmap ? { position: p, bitmap: frame.bitmap } : null;
    };
    const exact = pick(position);
    if (exact) return exact;
    const back = -this.direction;
    for (let d = 1; d < n; d++) {
      const found = pick(position + back * d) ?? pick(position - back * d);
      if (found) return found;
    }
    return null;
  }

  /**
   * How many frames ahead of `position` in `direction` are decoded and ready to draw.
   * Tolerates a single-frame decode bubble if the frame immediately after it is ready, so
   * minor decode variance never stalls the playhead abruptly to CREEP.
   */
  readyRun(position: number, direction: number): number {
    const n = this.unique.length, limit = this.profile.ahead;
    let gaps = 0;
    let ready = 0;
    for (let d = 1; d <= limit; d++) {
      const p = position + d * direction;
      if (p < 0 || p >= n) return limit;
      if (this.frames[this.unique[p]].bitmap) {
        ready++;
      } else if (++gaps > 1) {
        return ready;
      }
    }
    return ready;
  }

  /** The visitor has scrolled into the sequence: from now on the frames around the playhead are fetched. */
  engage() {
    if (this.engaged) return;
    this.engaged = true;
    this.pump();
  }

  /**
   * The page has loaded and gone idle: start the warm-up. Until then only the opening frames are fetched, so the hero's frames
   * never compete with the page's own fonts and images for the connection during the first seconds of the visit.
   */
  allowWarm() {
    if (this.warmAllowed) return;
    this.warmAllowed = true;
    this.pump();
  }

  dispose() {
    this.disposed = true;
    clearTimeout(this.retryTimer);
    globalThis.removeEventListener?.('online', this.reconnected);
    this.frames.forEach(frame => { frame.controller?.abort(); frame.bitmap?.close(); frame.bitmap = undefined; frame.blob = undefined; });
  }

  /** Retain the rolling window, current frame, poster, and the selected stage's tail. */
  private updateWanted() {
    const { ahead, behind } = this.profile;
    const n = this.unique.length;
    const wanted = new Set<number>();
    const centre = this.centre();
    if (!this.resting) {
      // Retain the recent reverse runway across a direction change. New decodes still follow windowOrder().
      for (let d = -Math.max(behind, this.profile.startBuffer - 1); d <= ahead; d++) {
        const p = centre + d * this.direction;
        if (p >= 0 && p < n) wanted.add(this.unique[p]);
      }
      for (const position of this.tail()) wanted.add(this.unique[position]);
    }
    if (n) {
      wanted.add(this.unique[0]);
      wanted.add(this.unique[this.focusAt]);
    }
    this.wanted = wanted;
    // Release frames that left the set; the canvas keeps what it last drew.
    this.frames.forEach((frame, u) => {
      if (frame.bitmap && !wanted.has(u)) { frame.bitmap.close(); frame.bitmap = undefined; }
    });
  }

  private tail(range = this.stage ?? this.upcoming[0]): number[] {
    if (!range) return [];
    const [from, to] = range;
    const dir = to >= from ? 1 : -1;
    const count = Math.min(TAIL_FRAMES, Math.abs(to - from) + 1);
    return Array.from({ length: count }, (_, index) => to - dir * index);
  }

  /** Window frames, nearest first, ahead of the scroll before behind it. */
  private windowOrder(): number[] {
    if (this.resting) return [];
    const { ahead, behind } = this.profile;
    const n = this.unique.length, order: number[] = [];
    const push = (p: number) => { if (p >= 0 && p < n) order.push(this.unique[p]); };
    const centre = this.centre();
    push(centre);
    // Give the active direction first use of the decode slots, with a short reverse runway next.
    for (let d = 1; d <= Math.max(ahead, behind, this.profile.startBuffer - 1); d++) {
      if (d <= ahead) push(centre + d * this.direction);
      if (d < this.profile.startBuffer) push(centre - d * this.direction);
    }
    for (let d = this.profile.startBuffer; d <= behind; d++) push(centre - d * this.direction);
    return order;
  }

  private sourceFor(u: number): ImageBitmapSource | undefined {
    if (u === 0 && this.first) {
      if ('complete' in this.first && !(this.first.complete && this.first.naturalWidth)) return undefined;
      return this.first;
    }
    return this.frames[u].blob;
  }

  /**
   * Fetch the opening runway and tail first, then the stage's middle. Keep the previous stage encoded for reverse playback
   * and fetch just one predicted stage in full. This bounds the encoded working set to nearby stages.
   */
  private plan(): { order: number[]; urgent: number } {
    const n = this.unique.length;
    const order: number[] = [], seen = new Set<number>();
    const add = (p: number) => {
      if (p < 0 || p >= n) return;
      const u = this.unique[p];
      if (!seen.has(u)) { seen.add(u); order.push(u); }
    };
    const range = ([a, b]: StageRange, limit = Infinity) => {
      const dir = b >= a ? 1 : -1, count = Math.min(Math.abs(b - a) + 1, limit);
      for (let d = 0; d < count; d++) add(a + d * dir);
    };
    const queue = (stage: StageRange) => {
      range(stage, this.profile.startBuffer);
      this.tail(stage).forEach(add);
      range(stage);
    };
    add(0);
    if (this.resting) {
      add(this.focusAt);
      return { order, urgent: order.length };
    }
    if (this.stage) queue(this.stage);
    const urgent = order.length;
    if (!this.engaged && !this.warmAllowed) return { order, urgent };
    if (this.upcoming[0]) queue(this.upcoming[0]);
    if (this.upcoming[1]) range(this.upcoming[1], this.profile.startBuffer);
    if (this.previous) range(this.previous);
    const centre = this.centre();
    const { ahead, behind, prefetch, prefetchBehind } = this.profile;
    const lookahead = this.engaged ? prefetch : this.profile.warm;
    for (const u of this.windowOrder()) if (!seen.has(u)) { seen.add(u); order.push(u); }
    for (let d = 1; d <= lookahead; d++) add(centre + (ahead + d) * this.direction);
    for (let d = 1; d <= prefetchBehind; d++) {
      add(centre - (Math.max(behind, this.profile.startBuffer - 1) + d) * this.direction);
    }
    return { order, urgent };
  }

  private pump() {
    if (this.disposed) return;
    // Frame 1 (the poster, already on its way as an <img>) gets the network strictly to itself: the site loader lifts as soon as it is
    // drawn, and a second lossless frame fetched beside it would only delay it (measured: ~1.6 s on a 5 Mbit/s link). The frames
    // after it start the moment the poster has loaded (provideFirst), which is within a few ms of it arriving.
    if (this.first === undefined) return;
    // A frame arriving behind a playhead that is waiting moves the window on to the next missing frame.
    if (!this.sequential && this.decodedGap(this.focusAt, this.direction, Math.max(1, this.profile.ahead - 1)) !== Infinity) this.sequential = true;
    const centred = this.centre();
    if (centred !== this.lastCentre) {
      this.lastCentre = centred;
      this.updateWanted();
    }
    const order = this.windowOrder();
    const plan = this.plan();
    // Frames outside the plan: cancel a request still in flight, drop an encoded file already held.
    const keep = new Set(plan.order);
    this.frames.forEach((frame, u) => {
      if (keep.has(u)) return;
      if (frame.fetching && frame.controller) { frame.cancelled = true; frame.controller.abort(); }
      else if (frame.blob) frame.blob = undefined;
    });
    // Fetch in plan order. Post-critical idle warm-up runs up to 2 gentle requests so opening frames are ready fast without starving page images.
    const warmCap = Math.min(2, this.profile.fetchConcurrency);
    const now = performance.now();
    let retryAt = Infinity;
    for (let i = 0; i < plan.order.length; i++) {
      const cap = this.engaged || i < plan.urgent ? this.profile.fetchConcurrency : warmCap;
      if (this.fetching >= cap) break;
      const u = plan.order[i];
      const frame = this.frames[u];
      if ((frame.retryAt ?? 0) > now) { retryAt = Math.min(retryAt, frame.retryAt!); continue; }
      if (frame.blob || frame.fetching || (u === 0 && this.first !== null)) continue;
      this.fetch(frame, i < plan.urgent ? 'high' : 'low');
    }
    const opening = order.slice(0, this.profile.startBuffer);
    const tail = this.resting ? [] : this.tail().map(position => this.unique[position]);
    const decodeOrder = new Set([...opening, ...tail, ...order, ...this.wanted]);
    for (const u of decodeOrder) {
      if (this.decoding >= this.profile.decodeConcurrency) break;
      if (!this.wanted.has(u)) continue;
      const frame = this.frames[u];
      if ((frame.retryAt ?? 0) > now) { retryAt = Math.min(retryAt, frame.retryAt!); continue; }
      if (frame.decoding || frame.bitmap) continue;
      // Fast zero-copy path for Frame 1 when the worker already received a full-size ImageBitmap from the poster.
      if (u === 0 && typeof ImageBitmap !== 'undefined' && this.first instanceof ImageBitmap) {
        frame.bitmap = this.first;
        this.unique.forEach((v, p) => { if (v === u) this.onFrame(p); });
        continue;
      }
      const source = this.sourceFor(u);
      if (source) this.decode(u, frame, source);
    }
    clearTimeout(this.retryTimer);
    this.retryTimer = Number.isFinite(retryAt) ? Number(setTimeout(() => this.pump(), Math.max(0, retryAt - performance.now()) + 5)) : 0;
  }

  private fetch(frame: Frame, priority: 'high' | 'low') {
    this.fetching++;
    frame.fetching = true;
    const controller = frame.controller = new AbortController();
    // Production frame URLs are content-hashed. Reuse their HTTP cache even if a decoded frame has been evicted.
    this.load(frame, priority, controller.signal)
      .then(blob => {
        if (this.disposed || frame.cancelled) return;
        frame.blob = blob;
        this.onDownload();
      }, () => { if (!this.disposed && !frame.cancelled) this.attemptFailed(frame); })
      .finally(() => { this.fetching--; frame.fetching = false; frame.cancelled = false; frame.controller = undefined; this.pump(); });
  }

  private async load(frame: Frame, priority: 'high' | 'low', signal: AbortSignal): Promise<Blob> {
    const immutable = HASHED_FRAME.test(frame.url);
    const store = immutable ? await this.openCache() : undefined;
    if (store && !frame.retries) {
      const stored = await store.match(frame.url).catch(() => undefined);
      if (stored) {
        const blob = await stored.blob().catch(() => undefined);
        if (blob) return blob;
      }
    }
    const cache = frame.retries ? 'reload' : immutable ? 'force-cache' : 'default';
    const response = await fetch(frame.url, { signal, priority, cache } as RequestInit);
    if (!response.ok) throw new Error(String(response.status));
    const blob = await response.blob();
    // Preserve encoded bytes behind the playhead even when the browser's HTTP cache is too small for a round trip.
    // A denied or full Cache Storage falls back to the ordinary HTTP cache.
    if (store && !signal.aborted) {
      await store.put(frame.url, new Response(blob, { headers: { 'Content-Type': blob.type } })).catch(() => undefined);
    }
    return blob;
  }

  private openCache() {
    return this.cache ??= (async () => {
      if (typeof caches === 'undefined') return;
      const cache = await caches.open(ENCODED_CACHE);
      const current = new Set(this.frames.map(frame => frame.url));
      // Limit this application-owned cache to the current, content-hashed sequence across deployments.
      const retired = (await cache.keys()).filter(request => !current.has(request.url));
      await Promise.all(retired.map(request => cache.delete(request)));
      return cache;
    })().catch(() => undefined);
  }

  /**
   * A download or decode failed: retry with capped exponential backoff. Frames are never treated as optional; stage playback
   * remains at its current frame until the original next frame is available and decoded.
   */
  private attemptFailed(frame: Frame) {
    frame.retries++;
    const delay = Math.min(RETRY_MS * 2 ** (frame.retries - 1), MAX_RETRY_MS);
    frame.retryAt = performance.now() + delay;
  }

  private decode(u: number, frame: Frame, source: ImageBitmapSource) {
    this.decoding++;
    frame.decoding = true;
    createImageBitmap(source)
      .then(bitmap => {
        if (this.disposed || !this.wanted.has(u)) { bitmap.close(); return; }
        frame.bitmap?.close();
        frame.bitmap = bitmap;
        frame.retries = 0;
        frame.retryAt = 0;
        this.unique.forEach((v, p) => { if (v === u) this.onFrame(p); });
      }, () => {
        // Undecodable (a damaged download, or a host answering a stale URL with a page): discard and retry the file.
        if (this.disposed) return;
        frame.blob = undefined;
        this.attemptFailed(frame);
      })
      .finally(() => { this.decoding--; frame.decoding = false; this.pump(); });
  }

}

type Context2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
const LETTERBOX = '#3a0811';
/** Seconds of playback that must already be decoded ahead of the playhead; its speed is limited to what that allows. */
const LOOKAHEAD = 0.12;
/** The slowest the playhead creeps when hardly anything ahead is decoded yet (frames per second). */
const CREEP = 10;
/** How long (ms) the scroll position must have been still before a held-up playhead is moved to it. */
const SETTLE_MS = 1200;
/**
 * Most the playhead's speed may change, in frames per second per second. A start from rest reaches full speed
 * in ~0.1 s; turning round at full speed takes ~0.2 s (the picture coasts a few frames on before it reverses)
 * instead of snapping from forward to backward.
 */
const ACCEL = 700;
interface Playing {
  /** Positions (0-based) the stage starts on and stops on. */
  from: number;
  to: number;
  /** Playing time and the share of it played (ms), and a pause before it starts (ms). */
  ms: number;
  t: number;
  delay: number;
  blend: boolean;
  /** Its frames have arrived and its opening run is decoded. */
  ready: boolean;
}

/**
 * One step of the playhead. Its speed aims for (distance to the goal) / time, which is an exponential approach
 * that eases to a stop on the goal; it is capped at `maxSpeed` and may change by at most ACCEL per second, so it
 * starts, stops and reverses without a jolt, never overshoots, and tracks a steadily moving goal at
 * `time` seconds behind it. Returns the new [position, speed].
 */
function follow(position: number, goal: number, speed: number, time: number, maxSpeed: number, dt: number): [number, number] {
  const aim = Math.max(-maxSpeed, Math.min(maxSpeed, (goal - position) / time));
  const room = ACCEL * dt;
  const next = speed + Math.max(-room, Math.min(room, aim - speed));
  const to = position + (speed + next) / 2 * dt;
  // A step that would pass the goal lands on it instead.
  return (goal - position) * (goal - to) < 0 ? [goal, 0] : [to, next];
}

/**
 * Owns the playhead and draws the frame it is on (or its nearest decoded
 * neighbour), only when what it would show changes. Used on both the worker
 * and the page.
 *
 * The page reports where the scroll position falls in the sequence (a
 * fractional frame number); the playhead follows it on this renderer's own
 * clock, one step per display frame, so a busy main thread cannot freeze it. Its
 * speed follows how many frames ahead are decoded, so it eases off instead of
 * leaping over frames that are not ready, and it is capped so that even a hard
 * fling plays through the footage frame by frame.
 */
export class FrameRenderer {
  private readonly store: FrameStore;
  private layout: RenderLayout | null = null;
  /** Where the scroll position falls in the sequence, and where the playhead is (fractional frames). */
  private goal = 0;
  private head = 0;
  /** Playhead speed in frames per second (signed) and the direction it last travelled. */
  private speed = 0;
  private dir = 1;
  private seeded = false;
  /** When the scroll position last changed (the renderer's own clock), and the value it had. */
  private goalChanged = 0;
  /** The frame wanted: the playhead rounded. */
  private target = 0;
  private drawn = -1;
  /** The frame dissolving in over the drawn one (-1: none) and its strength (0-1, in steps of 1/64). */
  private mixWith = -1;
  private mixDrawn = 0;
  /** The stage being played (see play), or null between stages. */
  private playing: Playing | null = null;
  private force = true;
  /** Time of the previous step; 0 while the playhead is at rest. */
  private clock = 0;
  private pending = 0;
  private disposed = false;
  private criticalLeft: Set<number>;

  constructor(
    private readonly canvas: { width: number; height: number },
    private readonly context: Context2D,
    urls: readonly string[],
    private readonly profile: RenderProfile,
    /** One-shot callback at the next display frame (rAF, or a timer where there is none). */
    private readonly schedule: (callback: (now: number) => void) => number,
    private readonly cancel: (handle: number) => void,
    private readonly onFirstDraw: () => void,
    /** Called once when the opening frame is decoded and ready to draw. */
    private readonly onCritical: () => void = () => {},
    /** Called when a stage has finished: its last frame (`position`, 0-based) is on the canvas, whole and fully decoded. */
    private readonly onPlayed: (position: number) => void = () => {},
  ) {
    this.criticalLeft = new Set(urls.length ? [0] : []);
    this.store = new FrameStore(urls, profile, position => this.arrived(position), () => {
      if (this.playing && !this.playing.ready) this.wake();
    });
  }

  provideFirst(first: FirstFrame) { this.store.provideFirst(first); }

  /** The visitor has started to scroll: begin fetching the frames the sequence will need (before the playhead moves). */
  engage() { this.store.engage(); }

  /** The page has loaded and gone idle: the warm-up of the next frames may begin. */
  allowWarm() { this.store.allowWarm(); }

  resize(layout: RenderLayout) {
    this.layout = layout;
    if (this.canvas.width !== layout.canvasWidth || this.canvas.height !== layout.canvasHeight) {
      this.canvas.width = layout.canvasWidth;
      this.canvas.height = layout.canvasHeight;
      this.context.imageSmoothingEnabled = true;
      this.context.imageSmoothingQuality = 'high';
      if (this.drawn < 0) {
        this.context.fillStyle = LETTERBOX;
        this.context.fillRect(0, 0, layout.canvasWidth, layout.canvasHeight);
      }
    }
    this.force = true;
    this.draw();
    if (this.playing) this.wake();
  }

  /**
   * Plays a stage: from the frame at `from` (0-based; it is the one on screen at rest) to `to`, over `ms`, after `delayMs`, on this
   * renderer's own clock. It starts after the opening run is decoded, then shows each frame in order while the rest streams in.
   */
  play(from: number, to: number, ms: number, delayMs: number, blend: boolean) {
    const last = Math.max(0, this.store.length - 1);
    const start = Math.min(last, Math.max(0, Math.round(from))), end = Math.min(last, Math.max(0, Math.round(to)));
    this.seeded = true;
    this.goal = this.head = start;
    this.target = start;
    this.clock = 0;
    this.speed = 0;
    this.dir = end >= start ? 1 : -1;
    this.playing = { from: start, to: end, ms: Math.max(1, ms), t: 0, delay: Math.max(0, delayMs), blend, ready: false };
    this.store.beginStage(start, end);
    this.wake();
  }

  /** Stages that may be played next (0-based position ranges): their frames are fetched ahead of time. */
  prepare(ranges: [number, number][]) { this.store.setUpcoming(ranges); }

  /** Where the scroll position falls in the sequence, as a (fractional) frame number. The playhead glides there. */
  seek(goal: number) {
    // A playing stage owns the playhead until it ends.
    if (this.playing) return;
    const next = Math.min(Math.max(0, this.store.length - 1), Math.max(0, goal));
    if (next > 0) this.store.engage();
    if (!this.seeded) {
      // The first position (page load, restored scroll) is where the playhead starts: no glide from frame 1.
      this.seeded = true;
      this.goal = this.head = next;
      this.speed = 0;
      this.show();
      return;
    }
    if (next === this.goal && !this.store.isResting) return;
    this.goal = next;
    this.goalChanged = performance.now();
    this.wake();
  }

  /** The hero is off screen: free the decoded window (about 3/4 of the frame memory); the next seek brings it back. */
  rest() { if (!this.playing) this.store.rest(); }

  dispose() {
    this.disposed = true;
    if (this.pending) this.cancel(this.pending);
    this.store.dispose();
  }

  private wake() {
    if (!this.pending && !this.disposed) this.pending = this.schedule(now => this.step(now));
  }

  /** One display frame of the playhead: glide toward the goal, then draw what that frame needs. */
  private step(now: number) {
    this.pending = 0;
    if (this.disposed) return;
    const dt = this.clock ? Math.min(0.1, Math.max(0.0005, (now - this.clock) / 1000)) : 1 / 60;
    this.clock = now;
    if (this.playing) { this.stepPlay(dt); return; }
    if (this.goal !== this.head) this.dir = this.goal > this.head ? 1 : -1;
    // The glide may not outrun the decoded frames: its speed limit follows the decoded run ahead of it.
    const run = this.store.readyRun(Math.round(this.head), this.dir);
    const waiting = this.store.shouldWait(Math.round(this.head), this.dir);
    // Stopped scrolling a while ago, and the playhead is still held up far behind: show the frame for the scroll position now
    // (the nearest decoded one at once, the frames around it as they arrive) instead of playing the gap out frame by frame.
    if (waiting && now - this.goalChanged > SETTLE_MS && Math.abs(this.goal - this.head) > this.profile.ahead * 2) {
      this.head = this.goal; this.speed = 0;
      this.store.jumped();
    }
    // Never creep on over frames that have not arrived: wait for the decoded frames behind (see FrameStore.shouldWait).
    // When nearing either endpoint with decoded frames ready ahead, gently raise catch-up speed so the sequence always reaches
    // frame 1 or the final frame before the sticky stage releases on brisk scrolls or mobile swipes.
    const stillWaiting = this.store.shouldWait(Math.round(this.head), this.dir);
    let limit = stillWaiting ? 0 : Math.min(this.profile.maxSpeed, Math.max(CREEP, run / LOOKAHEAD));
    const last = Math.max(0, this.store.length - 1);
    const distance = Math.abs(this.goal - this.head);
    if (!stillWaiting && (this.goal >= last - 1.5 || this.goal <= 0.5) && distance > 2 && run >= Math.min(distance, 4)) {
      limit = Math.max(limit, Math.min(this.profile.maxSpeed * 1.5, distance / 0.25));
    }
    const from = this.head;
    [this.head, this.speed] = follow(this.head, this.goal, this.speed, this.profile.glide, limit, dt);
    // Never more than one frame per display frame: the frame shown changes by at most one, so even a hard fling plays every
    // frame in order instead of leaping over some (at 60 Hz the old speed caps of 84-150 frames/s skipped 1-2 frames per draw).
    // A slow display frame (jank) slows the playhead for that frame rather than letting it jump.
    if (Math.abs(this.head - from) > 1) { this.head = from + Math.sign(this.head - from); this.speed = Math.sign(this.speed) * Math.min(Math.abs(this.speed), 1 / dt); }
    if (Math.abs(this.goal - this.head) < 0.004 && Math.abs(this.speed) < 0.2) { this.head = this.goal; this.speed = 0; }
    this.show();
    if (this.head !== this.goal) this.wake();
    else this.clock = 0;
  }

  /** One display frame of a playing stage (see play). */
  private stepPlay(dt: number) {
    const play = this.playing!;
    const dir = play.to >= play.from ? 1 : -1;
    const span = Math.abs(play.to - play.from);
    this.dir = dir;
    if (!play.ready) play.ready = this.store.stageReady(play.from, play.to);
    let waiting = !play.ready;
    if (play.delay > 0) {
      play.delay = Math.max(0, play.delay - dt * 1000);
      waiting = false;
    } else if (play.ready && play.t < play.ms) {
      const interval = span ? play.ms / span : play.ms;
      const elapsed = Math.min(play.ms, play.t + Math.min(interval, dt * 1000));
      const progress = span * (elapsed / play.ms);
      const next = play.from + dir * Math.floor(progress + 1e-8);
      const need = play.blend ? play.from + dir * Math.ceil(progress - 1e-8) : next;
      waiting = !this.store.decodedBetween(this.target, need);
      if (!waiting) {
        play.t = elapsed;
        this.head = elapsed === play.ms ? play.to : play.from + dir * progress;
      }
    }
    // The frame the playhead has reached, and (dissolving in) the next one.
    const base = dir > 0 ? Math.floor(this.head + 1e-6) : Math.ceil(this.head - 1e-6);
    this.target = base;
    this.store.focus(base, dir);
    this.draw(play.blend ? base + dir : -1, play.blend ? Math.abs(this.head - base) : 0);
    // Complete only after the original ending frame is on the canvas without a blend.
    if (play.t >= play.ms && this.drawn === play.to && this.mixDrawn === 0) {
      this.playing = null;
      this.goal = this.head = play.to;
      this.clock = 0;
      this.store.finishStage();
      this.onPlayed(play.to);
      return;
    }
    // Decodes wake a blocked stage. A slow link must not spin the display loop or accumulate elapsed time.
    if (waiting) this.clock = 0;
    else this.wake();
  }

  /** Point the frame store at the playhead's frame and draw it. */
  private show() {
    this.target = Math.round(this.head);
    this.store.focus(this.target, this.dir);
    this.draw();
  }

  private arrived(position: number) {
    if (this.criticalLeft.size && this.criticalLeft.delete(position) && !this.criticalLeft.size) this.onCritical();
    const better = this.drawn < 0 || Math.abs(position - this.target) < Math.abs(this.drawn - this.target);
    if (better || this.playing) this.wake();
  }

  /**
   * Draws the target frame (or its nearest decoded neighbour) and, while a stage dissolves from one frame to the next, `next` over
   * it at strength `mix`. Nothing is redrawn unless what it would show has changed (the strength moves in steps of 1/64).
   */
  private draw(next = -1, mix = 0) {
    const layout = this.layout;
    if (!layout || this.disposed) return;
    // During a stage a neighboring bitmap can be ahead of the playhead. Hold the current picture until the exact frame arrives.
    const frame = this.playing ? this.store.exact(this.target) : this.store.nearest(this.target);
    if (!frame) return;
    const over = next >= 0 && mix > 0 && frame.position === this.target ? this.store.exact(next) : null;
    const strength = over ? Math.round(mix * 64) / 64 : 0;
    const overAt = strength > 0 ? over!.position : -1;
    if (!this.force && frame.position === this.drawn && strength === this.mixDrawn && overAt === this.mixWith) return;
    const repaint = this.force;
    this.force = false;
    if (!layout.cover && (repaint || this.drawn < 0)) {
      this.context.fillStyle = LETTERBOX;
      this.context.fillRect(0, 0, layout.canvasWidth, layout.canvasHeight);
    }
    // Canvas scales the already-decoded original to the display's contain rectangle.
    this.context.drawImage(frame.bitmap, layout.x, layout.y, layout.w, layout.h);
    if (strength > 0) {
      this.context.globalAlpha = strength;
      this.context.drawImage(over!.bitmap, layout.x, layout.y, layout.w, layout.h);
      this.context.globalAlpha = 1;
    }
    if (this.drawn < 0) this.onFirstDraw();
    this.drawn = frame.position;
    this.mixDrawn = strength;
    this.mixWith = overAt;
  }
}
