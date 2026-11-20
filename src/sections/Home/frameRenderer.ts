/**
 * Frame store and renderer for the hero sequence. DOM-free, so the same code
 * runs in a worker on an OffscreenCanvas (the normal path) or on the page's
 * own canvas (fallback for browsers without OffscreenCanvas).
 *
 * Measured bottlenecks this design removes (Chrome, real GPU, 1440×900):
 * - drawImage(<img>) re-decoded each 1920×1088 frame synchronously on the
 *   main thread at draw time (~30 ms per frame): frames are now decoded ahead,
 *   off the main thread, at exactly the drawn size.
 * - createImageBitmap(blob) took ~72 ms per 1920×1088 WebP and topped out near
 *   50 frames/s however many decodes ran at once, below what ordinary wheel
 *   scrolling asks for, so the canvas froze and then jumped (up to 32 frames
 *   in one step). WebCodecs ImageDecoder decodes the same file in ~19 ms and
 *   scales to ~200 frames/s, so it is used wherever the browser has it.
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
   * 0 = the letterbox is flat maroon (desktop). Above 0 (phones and tablets) the letterbox is a soft wash of the
   * frame's own edge colours that fades into the maroon; this is its strength at the frame's edge (0-1).
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

interface Frame {
  url: string;
  /** Encoded file, kept for every frame once fetched (~160 KB each). */
  blob?: Blob;
  fetching: boolean;
  failed: boolean;
  /** Decoded pixels at `bitmapSize`; only a bounded set is kept. */
  bitmap?: ImageBitmap;
  bitmapSize?: string;
  decoding: boolean;
}

/**
 * Fetches every frame once (identical files share one request), keeps the
 * encoded files, and keeps a bounded set of frames decoded around the scroll
 * position. Decoding runs off the main thread; frames leaving the set are
 * released with ImageBitmap.close().
 */
export class FrameStore {
  /** Position in the sequence → unique frame (the footage repeats a few frames). */
  private readonly unique: number[] = [];
  private readonly frames: Frame[] = [];
  private readonly fetchOrder: number[] = [];
  private readonly abort = new AbortController();
  private fetching = 0;
  private decoding = 0;
  private focusAt = 0;
  private direction = 1;
  private width = 0;
  private height = 0;
  private resize = false;
  private sizeKey = '';
  private disposed = false;
  private wanted = new Set<number>();
  /** undefined: not provided yet (wait); null: fetch frame 1 like the others. */
  private first: FirstFrame | undefined;
  /** Decoder in use: WebCodecs ImageDecoder ('fast') once probed, otherwise createImageBitmap. */
  private decoder: 'probing' | 'fast' | 'standard' = 'probing';
  /** The hero is off screen: only the keyframes are kept decoded. */
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
    // Coarse to fine: the first and last frames, then every 32nd, 16th … every frame.
    const seen = new Set<number>();
    const add = (u: number | undefined) => { if (u !== undefined && !seen.has(u)) { seen.add(u); this.fetchOrder.push(u); } };
    add(this.unique[0]);
    add(this.unique[urls.length - 1]);
    for (let stride = 32; stride >= 1; stride /= 2) for (let p = 0; p < urls.length; p += stride) add(this.unique[p]);
    this.updateWanted();
    void this.probeDecoder();
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

  private async probeDecoder() {
    let fast = false;
    try { fast = typeof ImageDecoder === 'function' && await ImageDecoder.isTypeSupported('image/webp'); } catch { fast = false; }
    this.decoder = fast ? 'fast' : 'standard';
    this.pump();
  }

  /** The visible poster is frame 1: decoded from it instead of being fetched twice. */
  provideFirst(first: FirstFrame) {
    this.first = first;
    this.pump();
  }

  /**
   * Pixel size frames are drawn at. Resizing while decoding halves decode
   * throughput (measured), so frames decode at full resolution and the GPU
   * scales them at draw time, unless the drawn area is under half the
   * source's (phones), where decoding smaller saves most of the memory.
   */
  setDrawSize(width: number, height: number, sourceWidth: number, sourceHeight: number) {
    const resize = width * height < 0.5 * sourceWidth * sourceHeight;
    const key = resize ? `${width}x${height}` : 'full';
    if (key === this.sizeKey) return;
    this.width = width;
    this.height = height;
    this.resize = resize;
    this.sizeKey = key;
    this.pump();
  }

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
   * How many frames in a row, starting next to `position` and heading in
   * `direction`, are decoded and ready to draw. The end of the sequence has
   * nothing further to wait for, so it counts as ready.
   */
  readyRun(position: number, direction: number): number {
    const n = this.unique.length, limit = this.profile.ahead;
    for (let d = 1; d <= limit; d++) {
      const p = position + d * direction;
      if (p < 0 || p >= n) return limit;
      if (!this.frames[this.unique[p]].bitmap) return d - 1;
    }
    return limit;
  }

  dispose() {
    this.disposed = true;
    this.abort.abort();
    this.frames.forEach(frame => { frame.bitmap?.close(); frame.bitmap = undefined; frame.blob = undefined; });
    if (this.first && 'close' in this.first) this.first.close();
  }

  /** Frames to keep decoded: the window around the focus, keyframes, first and last. */
  private updateWanted() {
    const { ahead, behind, keyStride } = this.profile;
    const n = this.unique.length;
    const wanted = new Set<number>();
    if (!this.resting) {
      for (let d = -behind; d <= ahead; d++) {
        const p = this.focusAt + d * this.direction;
        if (p >= 0 && p < n) wanted.add(this.unique[p]);
      }
    }
    for (let p = 0; p < n; p += keyStride) wanted.add(this.unique[p]);
    if (n) { wanted.add(this.unique[0]); wanted.add(this.unique[n - 1]); }
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
    push(this.focusAt);
    for (let d = 1; d <= ahead; d++) { push(this.focusAt + d * this.direction); if (d <= behind) push(this.focusAt - d * this.direction); }
    return order;
  }

  private sourceFor(u: number): ImageBitmapSource | undefined {
    if (u === 0 && this.first) {
      if ('complete' in this.first && !(this.first.complete && this.first.naturalWidth)) return undefined;
      return this.first;
    }
    return this.frames[u].blob;
  }

  private pump() {
    if (this.disposed) return;
    // Frame 1 (the poster) gets the network to itself first: on slow connections it
    // arrives seconds sooner, and it is the frame on screen when the sequence starts.
    if (this.first === undefined) return;
    const order = this.windowOrder();
    // Fetch: the window first, then everything coarse-to-fine.
    for (const u of [...order, ...this.fetchOrder]) {
      if (this.fetching >= this.profile.fetchConcurrency) break;
      const frame = this.frames[u];
      if (frame.blob || frame.fetching || frame.failed || (u === 0 && this.first !== null)) continue;
      this.fetch(frame);
    }
    if (!this.width || this.decoder === 'probing') return;
    // Decode: wanted frames missing or decoded at an old size; window first, then keyframes nearest first.
    const inWindow = new Set(order);
    const centre = this.unique[this.focusAt] ?? 0;
    const rest = [...this.wanted].filter(u => !inWindow.has(u)).sort((a, b) => Math.abs(a - centre) - Math.abs(b - centre));
    for (const u of [...order, ...rest]) {
      if (this.decoding >= this.profile.decodeConcurrency) break;
      const frame = this.frames[u];
      if (frame.decoding || (frame.bitmap && frame.bitmapSize === this.sizeKey)) continue;
      const source = this.sourceFor(u);
      if (source) this.decode(u, frame, source);
    }
  }

  private fetch(frame: Frame) {
    this.fetching++;
    frame.fetching = true;
    fetch(frame.url, { signal: this.abort.signal })
      .then(response => { if (!response.ok) throw new Error(String(response.status)); return response.blob(); })
      .then(blob => { frame.blob = blob; }, () => { frame.failed = !this.disposed; })
      .finally(() => { this.fetching--; frame.fetching = false; this.pump(); });
  }

  private decode(u: number, frame: Frame, source: ImageBitmapSource) {
    this.decoding++;
    frame.decoding = true;
    const size = this.sizeKey;
    const resize = this.resize ? { width: this.width, height: this.height } : null;
    const decoded = this.decoder === 'fast' && source instanceof Blob
      ? this.decodeFast(source, resize)
      : this.decodeStandard(source, resize);
    decoded
      .then(bitmap => {
        if (this.disposed || !this.wanted.has(u)) { bitmap.close(); return; }
        frame.bitmap?.close();
        frame.bitmap = bitmap;
        frame.bitmapSize = size;
        this.unique.forEach((v, p) => { if (v === u) this.onFrame(p); });
      }, () => { /* undecodable: its neighbours are shown instead */ })
      .finally(() => { this.decoding--; frame.decoding = false; this.pump(); });
  }

  private decodeStandard(source: ImageBitmapSource, resize: { width: number; height: number } | null): Promise<ImageBitmap> {
    return resize
      ? createImageBitmap(source, { resizeWidth: resize.width, resizeHeight: resize.height, resizeQuality: 'medium' })
        .catch(() => createImageBitmap(source)) // engines without resize options: drawn scaled instead
      : createImageBitmap(source);
  }

  /**
   * WebCodecs path: the encoded file is decoded to a YUV VideoFrame (~19 ms) and converted to an
   * ImageBitmap (~3 ms), which then draws ~5x faster than a bitmap made by createImageBitmap(blob).
   * Same resolution; pixels match the standard decoder to within 2/255 (PSNR ≈ 55 dB, YUV→RGB rounding).
   */
  private async decodeFast(blob: Blob, resize: { width: number; height: number } | null): Promise<ImageBitmap> {
    try {
      const decoder = new ImageDecoder({ data: await blob.arrayBuffer(), type: 'image/webp' });
      try {
        const { image } = await decoder.decode();
        try {
          return resize
            ? await createImageBitmap(image, { resizeWidth: resize.width, resizeHeight: resize.height, resizeQuality: 'medium' })
              .catch(() => createImageBitmap(image))
            : await createImageBitmap(image);
        } finally { image.close(); }
      } finally { decoder.close(); }
    } catch (error) {
      if (this.disposed) throw error;
      // This browser cannot decode a frame this way: use the standard decoder from now on.
      this.decoder = 'standard';
      return this.decodeStandard(blob, resize);
    }
  }
}

type Context2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
/** Frames decoded before the sequence counts as ready: frame 1 and the next few. */
export const CRITICAL_FRAMES = 6;
const LETTERBOX = '#3a0811';
/** The letterbox colour as rgb, for the wash's fade into it. */
const LETTERBOX_RGB = '58,8,17';
/** The wash is sampled from this share of the frame's edge, at this many points along it. */
const EDGE_SHARE = 0.04;
const EDGE_POINTS = 10;
/** The wash follows the footage loosely: its colours are refreshed every few frames, not on every draw. */
const EDGE_REFRESH = 3;
/** Wash strength at the far end of a band, as a share of maroon (it is `layout.ambient` at the frame's edge). */
const WASH_FAR = 0.96;

type Edge = 'top' | 'bottom' | 'left' | 'right';
interface EdgeSample { canvas: OffscreenCanvas | HTMLCanvasElement; context: Context2D }

/** A tiny canvas holding the colours along one edge of a frame (one pixel thick, EDGE_POINTS long). */
function edgeSample(edge: Edge): EdgeSample | null {
  const horizontal = edge === 'top' || edge === 'bottom';
  const width = horizontal ? EDGE_POINTS : 1, height = horizontal ? 1 : EDGE_POINTS;
  const canvas = typeof OffscreenCanvas === 'function' ? new OffscreenCanvas(width, height) : Object.assign(document.createElement('canvas'), { width, height });
  const context = canvas.getContext('2d');
  if (!context) return null;
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  return { canvas, context };
}
/** Seconds of playback that must already be decoded ahead of the playhead; its speed is limited to what that allows. */
const LOOKAHEAD = 0.12;
/** The slowest the playhead creeps when hardly anything ahead is decoded yet (frames per second). */
const CREEP = 10;
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
  /** The frame wanted: the playhead rounded. */
  private target = 0;
  private drawn = -1;
  private drawnSharp = false;
  private force = true;
  /** Edge colours for the letterbox wash (phones and tablets): the sampled edges, the frame they came from and the layout they fit. */
  private edges: Partial<Record<Edge, EdgeSample>> = {};
  private edgeFrame = -1000;
  private edgeLayout = '';
  private washes: Partial<Record<Edge, CanvasGradient>> = {};
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
    const limit = Math.min(this.profile.maxSpeed, Math.max(CREEP, run / LOOKAHEAD));
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
    this.force = false;
    if (layout.cover) { /* the frame fills the canvas: nothing to paint around it */ }
    else if (layout.ambient > 0) this.paintWash(layout, frame.bitmap, frame.position);
    else { this.context.fillStyle = LETTERBOX; this.context.fillRect(0, 0, layout.canvasWidth, layout.canvasHeight); }
    // At the decoded size this is a 1:1 copy: no decode and no resampling at draw time.
    this.context.drawImage(frame.bitmap, layout.x, layout.y, layout.w, layout.h);
    if (this.drawn < 0) this.onFirstDraw();
    this.drawn = frame.position;
    this.drawnSharp = frame.sharp;
  }

  /**
   * Phones and tablets: the frame is shown whole, so a landscape frame on a tall screen leaves space above and below
   * it (or beside it on a landscape phone). Fill that space with a wash of the frame's own edge colours that fades
   * into the maroon the further it is from the frame, so the picture does not float in an empty screen. The edge
   * colours come from a few tiny samples, refreshed every few frames (the wash is soft; it need not track every
   * frame), so the cost per draw is a handful of band fills, with no readback of the decoded frame.
   */
  private paintWash(layout: RenderLayout, bitmap: ImageBitmap, position: number) {
    const context = this.context;
    const { canvasWidth, canvasHeight, x, y, w, h } = layout;
    const bands: [Edge, number, number, number, number][] = [];
    if (y > 0) bands.push(['top', 0, 0, canvasWidth, y]);
    if (y + h < canvasHeight) bands.push(['bottom', 0, y + h, canvasWidth, canvasHeight - y - h]);
    if (x > 0) bands.push(['left', 0, 0, x, canvasHeight]);
    if (x + w < canvasWidth) bands.push(['right', x + w, 0, canvasWidth - x - w, canvasHeight]);

    const key = `${canvasWidth}x${canvasHeight}:${x},${y},${w},${h}:${layout.ambient}`;
    if (key !== this.edgeLayout) { this.edgeLayout = key; this.edgeFrame = -1000; this.washes = {}; }
    // Stale after a layout change (edgeFrame was reset) or once the playhead has moved a few frames on.
    const stale = Math.abs(position - this.edgeFrame) >= EDGE_REFRESH;

    context.fillStyle = LETTERBOX;
    for (const [edge, bx, by, bw, bh] of bands) {
      context.fillRect(bx, by, bw, bh);
      let sample = this.edges[edge];
      let fresh = stale;
      if (!sample) { const made = edgeSample(edge); if (!made) continue; sample = this.edges[edge] = made; fresh = true; }
      if (fresh) {
        const sw = bitmap.width, sh = bitmap.height;
        const ex = Math.max(1, Math.round(sw * EDGE_SHARE)), ey = Math.max(1, Math.round(sh * EDGE_SHARE));
        if (edge === 'top') sample.context.drawImage(bitmap, 0, 0, sw, ey, 0, 0, EDGE_POINTS, 1);
        else if (edge === 'bottom') sample.context.drawImage(bitmap, 0, sh - ey, sw, ey, 0, 0, EDGE_POINTS, 1);
        else if (edge === 'left') sample.context.drawImage(bitmap, 0, 0, ex, sh, 0, 0, 1, EDGE_POINTS);
        else sample.context.drawImage(bitmap, sw - ex, 0, ex, sh, 0, 0, 1, EDGE_POINTS);
      }
      // The edge colours stretched across the band, then darkened toward the maroon with distance from the frame.
      context.drawImage(sample.canvas, bx, by, bw, bh);
      let wash = this.washes[edge];
      if (!wash) {
        const near = layout.ambient, far = WASH_FAR;
        const from = edge === 'top' ? [0, by + bh, 0, by] : edge === 'bottom' ? [0, by, 0, by + bh] : edge === 'left' ? [bx + bw, 0, bx, 0] : [bx, 0, bx + bw, 0];
        wash = context.createLinearGradient(from[0], from[1], from[2], from[3]);
        wash.addColorStop(0, `rgba(${LETTERBOX_RGB},${near})`);
        wash.addColorStop(0.5, `rgba(${LETTERBOX_RGB},${(near + (far - near) * 0.6).toFixed(3)})`);
        wash.addColorStop(1, `rgba(${LETTERBOX_RGB},${far})`);
        this.washes[edge] = wash;
      }
      context.fillStyle = wash;
      context.fillRect(bx, by, bw, bh);
      context.fillStyle = LETTERBOX;
    }
    if (stale) this.edgeFrame = position;
  }
}
