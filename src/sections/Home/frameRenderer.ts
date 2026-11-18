/**
 * Frame store and renderer for the hero sequence. DOM-free, so the same code
 * runs in a worker on an OffscreenCanvas (the normal path) or on the page's
 * own canvas (fallback for browsers without OffscreenCanvas).
 *
 * Measured bottlenecks this design removes (Chrome, real GPU, 1440×900):
 * - drawImage(<img>) re-decoded each 1920×1088 frame synchronously on the
 *   main thread at draw time (~30 ms per frame): frames are now decoded ahead
 *   with createImageBitmap, off the main thread, at exactly the drawn size.
 * - drawing a CPU bitmap into an accelerated canvas uploads it to the GPU at
 *   draw time (~11 ms per frame on the main thread): in the worker path that
 *   upload happens on the worker, so the page's main thread does no image work.
 */

export interface RenderProfile {
  fetchConcurrency: number;
  decodeConcurrency: number;
  /** Decoded window around the current frame, in the scroll direction and behind it. */
  ahead: number;
  behind: number;
  /** Keyframes kept decoded across the sequence, so a fast jump always has a close neighbour. */
  keyStride: number;
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
    if (position === this.focusAt && !turned) return;
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
    for (let d = -behind; d <= ahead; d++) {
      const p = this.focusAt + d * this.direction;
      if (p >= 0 && p < n) wanted.add(this.unique[p]);
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
    if (!this.width) return;
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
    const decoded = this.resize
      ? createImageBitmap(source, { resizeWidth: this.width, resizeHeight: this.height, resizeQuality: 'medium' })
        .catch(() => createImageBitmap(source)) // engines without resize options: drawn scaled instead
      : createImageBitmap(source);
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
}

type Context2D = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;
/** Frames decoded before the sequence counts as ready: frame 1 and the next few. */
export const CRITICAL_FRAMES = 6;
const LETTERBOX = '#3a0811';

/**
 * Draws the wanted frame (or its nearest decoded neighbour) and repaints only
 * when what it would show changes. Used on both the worker and the page.
 */
export class FrameRenderer {
  private readonly store: FrameStore;
  private layout: RenderLayout | null = null;
  private target = 0;
  private drawn = -1;
  private drawnSharp = false;
  private force = true;
  private pending = 0;
  private disposed = false;
  private criticalLeft: Set<number>;

  constructor(
    private readonly canvas: { width: number; height: number },
    private readonly context: Context2D,
    urls: readonly string[],
    profile: RenderProfile,
    /** Coalesced one-shot repaint for frames that arrive while nothing is scrolling. */
    private readonly schedule: (callback: () => void) => number,
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

  /** Show sequence position `target`; `direction` is the scroll direction (sign). */
  show(target: number, direction: number) {
    if (target === this.target && !this.force) return;
    this.target = target;
    this.store.focus(target, direction);
    this.draw();
  }

  dispose() {
    this.disposed = true;
    if (this.pending) this.cancel(this.pending);
    this.store.dispose();
  }

  private arrived(position: number) {
    if (this.criticalLeft.size && this.criticalLeft.delete(position) && !this.criticalLeft.size) this.onCritical();
    const better = Math.abs(position - this.target) < Math.abs(this.drawn - this.target) || (position === this.drawn && !this.drawnSharp);
    if (!better || this.pending || this.disposed) return;
    this.pending = this.schedule(() => { this.pending = 0; this.draw(); });
  }

  private draw() {
    const layout = this.layout;
    if (!layout || this.disposed) return;
    const frame = this.store.nearest(this.target);
    if (!frame) return;
    if (!this.force && frame.position === this.drawn && frame.sharp === this.drawnSharp) return;
    this.force = false;
    if (!layout.cover) { this.context.fillStyle = LETTERBOX; this.context.fillRect(0, 0, layout.canvasWidth, layout.canvasHeight); }
    // At the decoded size this is a 1:1 copy: no decode and no resampling at draw time.
    this.context.drawImage(frame.bitmap, layout.x, layout.y, layout.w, layout.h);
    if (this.drawn < 0) this.onFirstDraw();
    this.drawn = frame.position;
    this.drawnSharp = frame.sharp;
  }
}
