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
  /**
   * Decode every frame at the source resolution and let the GPU scale it, even when it is drawn well below that. Decoding at the
   * drawn size is what keeps a phone's memory small, but it costs about 2.5x the decode time of a lossless frame (measured:
   * 19-28 frames/s against 48-61), so it is kept for phones and low-power devices only.
   */
  fullDecode: boolean;
  decodeConcurrency: number;
  /** Decoded window around the current frame, in the scroll direction and behind it. */
  ahead: number;
  behind: number;
  /** Keyframes kept decoded across the sequence, so a fast jump always has a close neighbour. */
  keyStride: number;
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
  /**
   * 0 = the letterbox is flat maroon (desktop). Above 0 (phones and tablets) the letterbox is a soft mirror image of
   * the frame's own edge that fades into the maroon; this is the maroon's strength at the frame's edge (0-1).
   */
  ambient: number;
  /** Decode size: the drawn size, never above the source resolution. */
  decodeWidth: number;
  decodeHeight: number;
  /** Source frame resolution. */
  sourceWidth: number;
  sourceHeight: number;
}

/** Frame 1 from the page (the poster): an element on the main thread, a bitmap in the worker. null = fetch it. */
export type FirstFrame = ImageBitmap | HTMLImageElement | null;

/** Frames decoded before the sequence counts as ready: frame 1 and the next few. Nothing else is needed until the visitor scrolls. */
export const CRITICAL_FRAMES = 4;

interface Frame {
  url: string;
  /** Encoded file, kept only while the frame is near the playhead (or a keyframe): lossless frames are ~0.85 MB each. */
  blob?: Blob;
  fetching: boolean;
  /** The request in flight, and whether it was cancelled because the playhead moved away (not a failure). */
  controller?: AbortController;
  cancelled?: boolean;
  failed: boolean;
  /** Decoded pixels at `bitmapSize`; only a bounded set is kept. */
  bitmap?: ImageBitmap;
  bitmapSize?: string;
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
  /** Sequence positions of the keyframes: the first and last frames and every `keyStride`th. */
  private readonly keyPositions: number[] = [];
  /** The visitor has scrolled into the sequence: fetch around the playhead, not just the opening frames. */
  private engaged = false;
  private fetching = 0;
  private decoding = 0;
  private focusAt = 0;
  /** The window's centre when the plan was last made (see centre()). */
  private lastCentre = -1;
  /** False right after the playhead was moved straight to the scroll position: the window is then centred on it, not on the last decoded frame. */
  private sequential = true;
  private direction = 1;
  private width = 0;
  private height = 0;
  private resize = false;
  private sizeKey = '';
  private disposed = false;
  private wanted = new Set<number>();
  /** undefined: not provided yet (wait); null: fetch frame 1 like the others. */
  private first: FirstFrame | undefined;
  private firstConsumed = false;
  /** The hero is off screen: only the keyframes and endpoints are kept decoded. */
  private resting = false;

  constructor(
    urls: readonly string[],
    private readonly profile: RenderProfile,
    /** Called with a sequence position whenever its frame becomes drawable. */
    private readonly onFrame: (position: number) => void,
  ) {
    const byUrl = new Map<string, number>();
    urls.forEach(url => {
      let u = byUrl.get(url);
      if (u === undefined) {
        u = this.frames.length;
        byUrl.set(url, u);
        this.frames.push({ url, fetching: false, failed: false, decoding: false });
      }
      this.unique.push(u);
    });
    if (urls.length) {
      this.keyPositions.push(0, urls.length - 1);
      for (let p = profile.keyStride; p < urls.length - 1; p += profile.keyStride) this.keyPositions.push(p);
    }
    this.updateWanted();
  }

  /** Number of positions in the sequence. */
  get length() { return this.unique.length; }

  get isResting() { return this.resting; }

  /** The hero is off screen: release the decoded window (the keyframes stay) until `focus` is called again. */
  rest() {
    if (this.resting) return;
    this.resting = true;
    this.updateWanted();
  }

  /** The visible poster is frame 1: decoded from it instead of being fetched twice. */
  provideFirst(first: FirstFrame) {
    this.first = first;
    this.pump();
  }

  /**
   * Pixel size frames are drawn at. Resizing while decoding more than halves decode
   * throughput (measured), so frames decode at full resolution and the GPU
   * scales them at draw time, unless the drawn area is under half the
   * source's (phones) and the profile does not ask for full decoding, where
   * decoding smaller saves most of the memory.
   */
  setDrawSize(width: number, height: number, sourceWidth: number, sourceHeight: number) {
    const resize = !this.profile.fullDecode && width * height < 0.5 * sourceWidth * sourceHeight;
    const key = resize ? `${width}x${height}` : 'full';
    if (key === this.sizeKey) return;
    this.width = width;
    this.height = height;
    this.resize = resize;
    this.sizeKey = key;
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
    this.updateWanted();
    this.pump();
  }

  /** The decoded frame closest to `position`, preferring the side already scrolled past. */
  nearest(position: number): { position: number; bitmap: ImageBitmap; sharp: boolean } | null {
    const n = this.unique.length;
    const pick = (p: number) => {
      const frame = p >= 0 && p < n ? this.frames[this.unique[p]] : undefined;
      return frame?.bitmap ? { position: p, bitmap: frame.bitmap, sharp: frame.bitmapSize === this.sizeKey } : null;
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

  dispose() {
    this.disposed = true;
    this.frames.forEach(frame => { frame.controller?.abort(); frame.bitmap?.close(); frame.bitmap = undefined; frame.blob = undefined; });
    if (this.first && !this.firstConsumed && 'close' in this.first) this.first.close();
  }

  /** Frames to keep decoded: the window around the focus, keyframes, first and last. */
  private updateWanted() {
    const { ahead, behind, keyStride } = this.profile;
    const n = this.unique.length;
    const wanted = new Set<number>();
    const centre = this.centre();
    if (!this.resting) {
      for (let d = -behind; d <= ahead; d++) {
        const p = centre + d * this.direction;
        if (p >= 0 && p < n) wanted.add(this.unique[p]);
      }
    }
    for (let p = 0; p < n; p += keyStride) wanted.add(this.unique[p]);
    if (n) {
      wanted.add(this.unique[0]);
      wanted.add(this.unique[n - 1]);
      if (n > 1) wanted.add(this.unique[n - 2]);
    }
    this.wanted = wanted;
    // Release frames that left the set; the canvas keeps what it last drew.
    this.frames.forEach((frame, u) => {
      if (frame.bitmap && !wanted.has(u)) { frame.bitmap.close(); frame.bitmap = undefined; frame.bitmapSize = undefined; }
    });
  }

  /** Window frames, nearest first, ahead of the scroll before behind it. */
  private windowOrder(): number[] {
    if (this.resting) return [];
    const { ahead, behind } = this.profile;
    const n = this.unique.length, order: number[] = [];
    const push = (p: number) => { if (p >= 0 && p < n) order.push(this.unique[p]); };
    const centre = this.centre();
    push(centre);
    for (let d = 1; d <= Math.max(ahead, behind); d++) {
      if (d <= ahead) push(centre + d * this.direction);
      if (d <= behind) push(centre - d * this.direction);
    }
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
   * The frames worth holding encoded, most urgent first, and how many of them are urgent. Before the visitor scrolls: the
   * opening frames, then a gentle background warm-up. Once they scroll: the bidirectional decoded window, the keyframes
   * nearest the playhead, then `prefetch` ahead and `prefetchBehind` behind so forward and reverse scrolling stay instant.
   */
  private plan(): { order: number[]; urgent: number } {
    const n = this.unique.length;
    const order: number[] = [], seen = new Set<number>();
    const add = (p: number) => {
      if (p < 0 || p >= n) return;
      const u = this.unique[p];
      if (!seen.has(u)) { seen.add(u); order.push(u); }
    };
    if (!this.engaged) {
      for (let p = 0; p < CRITICAL_FRAMES; p++) add(p);
      const urgent = order.length;
      for (let p = CRITICAL_FRAMES; p < CRITICAL_FRAMES + this.profile.warm; p++) add(p);
      return { order, urgent };
    }
    for (const u of this.windowOrder()) if (!seen.has(u)) { seen.add(u); order.push(u); }
    const urgent = order.length;
    const centre = this.centre();
    [...this.keyPositions].sort((a, b) => Math.abs(a - centre) - Math.abs(b - centre)).forEach(add);
    if (!this.resting) {
      const { ahead, behind, prefetch, prefetchBehind } = this.profile;
      const span = Math.max(prefetch, prefetchBehind);
      for (let d = 1; d <= span; d++) {
        if (d <= prefetch) add(centre + (ahead + d) * this.direction);
        if (d <= prefetchBehind) add(centre - (behind + d) * this.direction);
      }
    }
    return { order, urgent };
  }

  private pump() {
    if (this.disposed) return;
    // Frame 1 (the poster) gets the network to itself first: on slow connections it
    // arrives seconds sooner, and it is the frame on screen when the sequence starts.
    if (this.first === undefined) return;
    // A frame arriving behind a playhead that is waiting moves the window on to the next missing frame.
    if (!this.sequential && this.decodedGap(this.focusAt, this.direction, Math.max(1, this.profile.ahead - 1)) !== Infinity) this.sequential = true;
    const centred = this.centre();
    if (centred !== this.lastCentre) { this.lastCentre = centred; this.updateWanted(); }
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
    for (let i = 0; i < plan.order.length; i++) {
      const cap = this.engaged || i < plan.urgent ? this.profile.fetchConcurrency : warmCap;
      if (this.fetching >= cap) break;
      const u = plan.order[i];
      const frame = this.frames[u];
      if (frame.blob || frame.fetching || frame.failed || (u === 0 && this.first !== null)) continue;
      this.fetch(frame);
    }
    if (!this.width) return;
    // Decode: wanted frames missing or decoded at an old size; window first, then keyframes nearest first.
    const inWindow = new Set(order);
    const centre = this.unique[this.centre()] ?? 0;
    const rest = [...this.wanted].filter(u => !inWindow.has(u)).sort((a, b) => Math.abs(a - centre) - Math.abs(b - centre));
    for (const u of [...order, ...rest]) {
      if (this.decoding >= this.profile.decodeConcurrency) break;
      const frame = this.frames[u];
      if (frame.decoding || (frame.bitmap && frame.bitmapSize === this.sizeKey)) continue;
      // Fast zero-copy path for Frame 1 when the worker already received a full-size ImageBitmap from the poster.
      if (u === 0 && !this.resize && !this.firstConsumed && typeof ImageBitmap !== 'undefined' && this.first instanceof ImageBitmap) {
        this.firstConsumed = true;
        frame.bitmap?.close();
        frame.bitmap = this.first;
        frame.bitmapSize = this.sizeKey;
        this.unique.forEach((v, p) => { if (v === 0) this.onFrame(p); });
        continue;
      }
      const source = this.sourceFor(u);
      if (source) this.decode(u, frame, source);
    }
  }

  private fetch(frame: Frame) {
    this.fetching++;
    frame.fetching = true;
    const controller = frame.controller = new AbortController();
    fetch(frame.url, { signal: controller.signal })
      .then(response => { if (!response.ok) throw new Error(String(response.status)); return response.blob(); })
      .then(blob => { frame.blob = blob; }, () => { frame.failed = !this.disposed && !frame.cancelled; })
      .finally(() => { this.fetching--; frame.fetching = false; frame.cancelled = false; frame.controller = undefined; this.pump(); });
  }

  private decode(u: number, frame: Frame, source: ImageBitmapSource) {
    this.decoding++;
    frame.decoding = true;
    const size = this.sizeKey;
    const resize = this.resize ? { width: this.width, height: this.height } : null;
    this.decodeBitmap(source, resize)
      .then(bitmap => {
        if (this.disposed || !this.wanted.has(u)) { bitmap.close(); return; }
        frame.bitmap?.close();
        frame.bitmap = bitmap;
        frame.bitmapSize = size;
        this.unique.forEach((v, p) => { if (v === u) this.onFrame(p); });
      }, () => { /* undecodable: its neighbours are shown instead */ })
      .finally(() => { this.decoding--; frame.decoding = false; this.pump(); });
  }

  private decodeBitmap(source: ImageBitmapSource, resize: { width: number; height: number } | null): Promise<ImageBitmap> {
    return resize
      ? createImageBitmap(source, { resizeWidth: resize.width, resizeHeight: resize.height, resizeQuality: 'medium' })
        .catch(() => createImageBitmap(source)) // engines without resize options: drawn scaled instead
      : createImageBitmap(source);
  }
}

type Context2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
const LETTERBOX = '#3a0811';
/** The letterbox colour as rgb, for the wash's fade into it. */
const LETTERBOX_RGB = '58,8,17';
/** The wash follows the footage loosely: its colours are refreshed every few frames, not on every draw. */
const EDGE_REFRESH = 3;
/** Wash strength at the far end of a band, as a share of maroon (it is `layout.ambient` at the frame's edge). */
const WASH_FAR = 0.6;

/**
 * A band's tile is this many pixels along the frame's edge and this many across it. The frame is shrunk into it, so the
 * band is a soft, blurred picture of the footage; stretching the tile over the band is what makes it smooth.
 */
const WASH_LONG = 64;
const WASH_SHORT = 32;
/**
 * How much of the frame a band reflects, at most, as a share of the frame's depth: only the part nearest the edge, stretched over
 * the band. Reflecting the whole frame would show a ghost of its figures upside-down; this is just the room's colour and light.
 */
const WASH_REACH = 0.4;

type Edge = 'top' | 'bottom' | 'left' | 'right';
/**
 * One band of the wash as a tiny canvas: a mirror image of the frame's own edge, blurred by the shrinking and darkened
 * toward the maroon with distance from the frame. Drawing it, stretched over the band, is the whole cost of painting the band.
 */
interface WashTile { canvas: OffscreenCanvas | HTMLCanvasElement; context: Context2D; shade: CanvasGradient | null; ambient: number }

function washTile(edge: Edge): WashTile | null {
  const horizontal = edge === 'top' || edge === 'bottom';
  const width = horizontal ? WASH_LONG : WASH_SHORT, height = horizontal ? WASH_SHORT : WASH_LONG;
  const canvas = typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(width, height) : Object.assign(document.createElement('canvas'), { width, height });
  const context = canvas.getContext('2d');
  if (!context) return null;
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  return { canvas, context, shade: null, ambient: -1 };
}
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
  private drawnSharp = false;
  private force = true;
  /** The letterbox wash (phones and tablets): a tile per band, the frame its colours came from, and the layout it was painted for. */
  private tiles: Partial<Record<Edge, WashTile>> = {};
  private edgeFrame = -1000;
  private edgeLayout = '';
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
    /** Called once, when the opening frames (CRITICAL_FRAMES) are decoded and ready to draw. */
    private readonly onCritical: () => void = () => {},
  ) {
    this.criticalLeft = new Set(Array.from({ length: Math.min(CRITICAL_FRAMES, urls.length) }, (_, i) => i));
    this.store = new FrameStore(urls, profile, position => this.arrived(position));
  }

  provideFirst(first: FirstFrame) { this.store.provideFirst(first); }

  /** The visitor has started to scroll: begin fetching the frames the sequence will need (before the playhead moves). */
  engage() { this.store.engage(); }

  resize(layout: RenderLayout) {
    this.layout = layout;
    if (this.canvas.width !== layout.canvasWidth || this.canvas.height !== layout.canvasHeight) {
      this.canvas.width = layout.canvasWidth;
      this.canvas.height = layout.canvasHeight;
      this.context.imageSmoothingEnabled = true;
      this.context.imageSmoothingQuality = 'high';
    }
    this.store.setDrawSize(layout.decodeWidth, layout.decodeHeight, layout.sourceWidth, layout.sourceHeight);
    this.force = true;
    this.draw();
  }

  /** Where the scroll position falls in the sequence, as a (fractional) frame number. The playhead glides there. */
  seek(goal: number) {
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
  rest() { this.store.rest(); }

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
    [this.head, this.speed] = follow(this.head, this.goal, this.speed, this.profile.glide, limit, dt);
    if (Math.abs(this.goal - this.head) < 0.004 && Math.abs(this.speed) < 0.2) { this.head = this.goal; this.speed = 0; }
    this.show();
    if (this.head !== this.goal) this.wake();
    else this.clock = 0;
  }

  /** Point the frame store at the playhead's frame and draw it. */
  private show() {
    this.target = Math.round(this.head);
    this.store.focus(this.target, this.dir);
    this.draw();
  }

  private arrived(position: number) {
    if (this.criticalLeft.size && this.criticalLeft.delete(position) && !this.criticalLeft.size) this.onCritical();
    const better = Math.abs(position - this.target) < Math.abs(this.drawn - this.target) || (position === this.drawn && !this.drawnSharp);
    if (better) this.wake();
  }

  private draw() {
    const layout = this.layout;
    if (!layout || this.disposed) return;
    const frame = this.store.nearest(this.target);
    if (!frame) return;
    if (!this.force && frame.position === this.drawn && frame.sharp === this.drawnSharp) return;
    const repaint = this.force;
    this.force = false;
    if (layout.cover) { /* the frame fills the canvas: nothing to paint around it */ }
    else if (layout.ambient > 0) this.paintWash(layout, frame.bitmap, frame.position, repaint, this.head === this.goal);
    else { this.context.fillStyle = LETTERBOX; this.context.fillRect(0, 0, layout.canvasWidth, layout.canvasHeight); }
    // At the decoded size this is a 1:1 copy: no decode and no resampling at draw time.
    this.context.drawImage(frame.bitmap, layout.x, layout.y, layout.w, layout.h);
    if (this.drawn < 0) this.onFirstDraw();
    this.drawn = frame.position;
    this.drawnSharp = frame.sharp;
  }

  /**
   * Phones and tablets: the frame is shown whole, so a landscape frame on a tall screen leaves space above and below
   * it (or beside it on a landscape phone). Fill that space with the footage itself: a soft mirror image of the frame's
   * edge that continues the picture outward and is darkened toward the maroon the further it is from the frame, so the
   * picture does not float in an empty screen.
   *
   * The canvas keeps its pixels between draws, so the bands are painted only when the layout changes or their colours
   * refresh (every EDGE_REFRESH frames while moving, exactly at rest; the wash is soft and need not track every frame). A refresh composes each
   * band's small tile from the frame, and painting a band is one stretched blit of that tile. Most draws
   * are therefore just the frame, as on desktop.
   */
  private paintWash(layout: RenderLayout, bitmap: ImageBitmap, position: number, repaint: boolean, settled: boolean) {
    const { canvasWidth, canvasHeight, x, y, w, h, ambient } = layout;
    const key = `${canvasWidth}x${canvasHeight}:${x},${y},${w},${h}:${ambient}`;
    if (key !== this.edgeLayout) { this.edgeLayout = key; this.edgeFrame = -1000; repaint = true; }
    // Stale after a layout change (edgeFrame was reset) or once the playhead has moved a few frames on. When the playhead
    // is at rest the colours are refreshed to this exact frame, so a frame looks the same however the scroll got there.
    const stale = Math.abs(position - this.edgeFrame) >= (settled ? 1 : EDGE_REFRESH);
    if (!repaint && !stale) return;

    const bands: [Edge, number, number, number, number][] = [];
    if (y > 0) bands.push(['top', 0, 0, canvasWidth, y]);
    if (y + h < canvasHeight) bands.push(['bottom', 0, y + h, canvasWidth, canvasHeight - y - h]);
    if (x > 0) bands.push(['left', 0, 0, x, canvasHeight]);
    if (x + w < canvasWidth) bands.push(['right', x + w, 0, canvasWidth - x - w, canvasHeight]);

    for (const [edge, bx, by, bw, bh] of bands) {
      let tile = this.tiles[edge];
      let fresh = stale;
      if (!tile) {
        const made = washTile(edge);
        if (!made) { this.context.fillStyle = LETTERBOX; this.context.fillRect(bx, by, bw, bh); continue; }
        tile = this.tiles[edge] = made;
        fresh = true;
      }
      if (fresh) this.composeTile(tile, edge, bitmap, ambient, edge === 'top' || edge === 'bottom' ? bh / h : bw / w);
      this.context.drawImage(tile.canvas, bx, by, bw, bh);
    }
    if (stale) this.edgeFrame = position;
  }

  /**
   * The frame's edge, mirrored, shrunk into the tile (that is the blur) and then darkened toward the maroon with
   * distance from the frame. The band touches the frame along the mirror line, so the picture carries on across the
   * frame's edge with no seam. `reach` is how deep the band is, as a share of the frame (it never reflects more than
   * WASH_REACH of it: a deeper band stretches that part).
   */
  private composeTile(tile: WashTile, edge: Edge, bitmap: ImageBitmap, ambient: number, reach: number) {
    const t = tile.context, tw = tile.canvas.width, th = tile.canvas.height;
    const sw = bitmap.width, sh = bitmap.height;
    const share = Math.min(WASH_REACH, Math.max(0.05, reach));
    const rw = Math.max(1, Math.round(sw * share)), rh = Math.max(1, Math.round(sh * share));
    t.save();
    if (edge === 'top') { t.translate(0, th); t.scale(1, -1); t.drawImage(bitmap, 0, 0, sw, rh, 0, 0, tw, th); }
    else if (edge === 'bottom') { t.translate(0, th); t.scale(1, -1); t.drawImage(bitmap, 0, sh - rh, sw, rh, 0, 0, tw, th); }
    else if (edge === 'left') { t.translate(tw, 0); t.scale(-1, 1); t.drawImage(bitmap, 0, 0, rw, sh, 0, 0, tw, th); }
    else { t.translate(tw, 0); t.scale(-1, 1); t.drawImage(bitmap, sw - rw, 0, rw, sh, 0, 0, tw, th); }
    t.restore();
    if (!tile.shade || tile.ambient !== ambient) {
      // Strongest at the frame's edge (`ambient`), fading to WASH_FAR at the far end of the band.
      const [x0, y0, x1, y1] = edge === 'top' ? [0, th, 0, 0] : edge === 'bottom' ? [0, 0, 0, th] : edge === 'left' ? [tw, 0, 0, 0] : [0, 0, tw, 0];
      const shade = t.createLinearGradient(x0, y0, x1, y1);
      shade.addColorStop(0, `rgba(${LETTERBOX_RGB},${ambient})`);
      shade.addColorStop(0.5, `rgba(${LETTERBOX_RGB},${(ambient + (WASH_FAR - ambient) * 0.6).toFixed(3)})`);
      shade.addColorStop(1, `rgba(${LETTERBOX_RGB},${WASH_FAR})`);
      tile.shade = shade;
      tile.ambient = ambient;
    }
    t.fillStyle = tile.shade;
    t.fillRect(0, 0, tw, th);
  }
}
