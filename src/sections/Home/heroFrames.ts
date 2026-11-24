/**
 * Hero frame sequence: frame URLs, device budgets and the renderer factory.
 *
 * The frames are lossless WebP encodings (1920×1088, pixel-identical) of the originals in
 * src/assets/animations/hero-frames/new_v1, produced in the same order by
 * scripts/build-hero-frames.py (new_v1_webp/manifest.json lists that order). Lossless frames are
 * large (~0.85 MB each), so only the frames around the scroll position are fetched
 * (see FrameStore in frameRenderer.ts). Rendering runs in a worker on an
 * OffscreenCanvas where supported, otherwise on the page.
 */
import { FrameRenderer } from './frameRenderer';
import type { RenderLayout, RenderProfile } from './frameRenderer';
import type { WorkerMessage, WorkerReply } from './frameRenderer.worker';

export type { RenderLayout } from './frameRenderer';

export const frameUrls: readonly string[] = Object.entries(
  import.meta.glob<string>('../../assets/animations/hero-frames/new_v1_webp/*.webp', { eager: true, query: '?url', import: 'default' }),
)
  .map(([path, url]) => ({ n: Number(path.match(/(\d+)\.webp$/)?.[1] ?? NaN), url: new URL(url, document.baseURI).href }))
  .filter(frame => Number.isFinite(frame.n))
  .sort((a, b) => a.n - b.n)
  .map(frame => frame.url);

/** Source frame size (all frames share it); refined from the poster once it loads. */
export const SOURCE_SIZE = { width: 1920, height: 1088 } as const;

interface DeviceHints extends Navigator {
  deviceMemory?: number;
  connection?: { saveData?: boolean; effectiveType?: string };
}

/** Budgets for decoded memory and work. Every device gets the full-resolution frames. */
export function deviceProfile(): RenderProfile & { maxDpr: number; maxArea: number } {
  const nav = navigator as DeviceHints;
  const saveData = Boolean(nav.connection?.saveData);
  const lowPower = saveData || (nav.deviceMemory ?? 8) <= 4 || (nav.hardwareConcurrency ?? 8) <= 4;
  // A slow link (2G/3G or Save-Data): lossless frames are ~0.85 MB each, so nothing is fetched before the visitor scrolls
  // and not far ahead of the playhead once they do.
  const slowLink = saveData || /^(slow-2g|2g|3g)$/.test(nav.connection?.effectiveType ?? '');
  // Phones and tablets: a swipe crosses the pinned range in a second or two, so the playhead must be able to keep up
  // (measured: at the desktop budget the hero started to leave with the sequence only a third of the way through).
  // The frames are decoded at the drawn size, so a phone's are small (~1.4 MB) and can be held further ahead; a tablet's
  // are not (~5 MB), so its window grows less. Desktop keeps the budgets below unchanged.
  const phone = matchMedia('(max-width: 600px)').matches;
  const touchSized = matchMedia('(max-width: 1023px)').matches;
  return {
    maxDpr: lowPower ? 1.5 : 2,
    /** Canvas backing-store budget in device pixels. */
    maxArea: lowPower ? 2_300_000 : 4_200_000,
    fetchConcurrency: slowLink ? 2 : lowPower ? 4 : 6,
    // Encoded frames kept ready beyond the decoded window (ahead and behind the playhead) so forward
    // and reverse scrolling never stall waiting on cold network fetches, while capping RAM safely.
    prefetch: slowLink ? 8 : lowPower ? 18 : phone ? 28 : 48,
    prefetchBehind: slowLink ? 4 : lowPower ? 8 : phone ? 14 : 20,
    warm: slowLink ? 0 : lowPower ? 12 : phone ? 18 : 36,
    // Tablets and desktop windows on capable machines decode at full size; phones & low-power decode at drawn size to save RAM.
    fullDecode: !lowPower && !phone,
    // Lossless frames decode concurrently off the main thread in the worker, scaling with CPU cores.
    decodeConcurrency: lowPower ? 2 : (nav.hardwareConcurrency ?? 8) >= 8 ? 6 : 4,
    // Bounded bidirectional decoded bitmap window: generous ahead lookahead + instant reverse-scroll buffer behind.
    ahead: lowPower ? (touchSized ? 14 : 12) : phone ? 22 : touchSized ? 16 : 18,
    behind: lowPower ? 5 : phone ? 10 : 8,
    keyStride: lowPower ? 28 : 20,
    // Smooth cinematic top speed during normal scroll; phones/tablets allow higher catch-up speed for fast swipes.
    maxSpeed: lowPower ? (touchSized ? 90 : 60) : phone ? 150 : touchSized ? 125 : 84,
    // Responsive cinematic glide: buttery start/stop without lagging noticeably behind the user's scroll.
    glide: touchSized ? 0.2 : 0.26,
  };
}

/**
 * How large a frame is drawn: "contain", so every frame is shown whole at its
 * own aspect ratio on every screen. Any spare space is the maroon letterbox,
 * feathered into the frame by .mm-hero__media::after.
 */
export function frameScale(width: number, height: number, sourceWidth: number, sourceHeight: number) {
  return Math.min(width / sourceWidth, height / sourceHeight);
}

export interface HeroRenderer {
  readonly mode: 'worker' | 'page';
  layout(layout: RenderLayout): void;
  /** Where the scroll position falls in the sequence (fractional frame number); the playhead glides there. */
  seek(goal: number): void;
  /** The visitor has started to scroll: begin fetching the frames around the playhead (idempotent). */
  engage(): void;
  /** The page has loaded and gone idle: begin the background warm-up of the next frames (idempotent). */
  allowWarm(): void;
  /** The hero is off screen: release the decoded window; the next seek brings it back. */
  rest(): void;
  dispose(): void;
}

interface Shared { renderer: HeroRenderer; users: number; timer: number; events: RendererEvents }
/** One renderer per canvas: a canvas can be handed to a worker only once (StrictMode re-runs effects). */
const shared = new WeakMap<HTMLCanvasElement, Shared>();

function canUseWorker(canvas: HTMLCanvasElement) {
  return typeof Worker === 'function' && typeof OffscreenCanvas === 'function' && 'transferControlToOffscreen' in canvas;
}

export interface RendererEvents {
  /** The canvas has drawn its first frame. */
  onReady: () => void;
  /** The opening frames are decoded: the sequence can start without waiting. */
  onCritical: () => void;
  /** A new frame is on the canvas; `ended`: it is the final frame, fully decoded. */
  onShown: (ended: boolean) => void;
}

function startWorker(canvas: HTMLCanvasElement, poster: HTMLImageElement, profile: RenderProfile, { onReady, onCritical, onShown }: RendererEvents): HeroRenderer {
  const worker = new Worker(new URL('./frameRenderer.worker.ts', import.meta.url), { type: 'module' });
  const post = (message: WorkerMessage, transfer: Transferable[] = []) => worker.postMessage(message, transfer);
  worker.onmessage = ({ data }: MessageEvent<WorkerReply>) => {
    if (data.type === 'ready') onReady();
    else if (data.type === 'critical' || data.type === 'failed') onCritical();
    else if (data.type === 'shown') onShown(data.ended);
  };
  const offscreen = canvas.transferControlToOffscreen();
  post({ type: 'init', canvas: offscreen, urls: frameUrls, profile }, [offscreen]);
  // Frame 1 is the poster the page already loaded: pass its pixels instead of fetching it again.
  poster.decode()
    .then(() => createImageBitmap(poster))
    .then(bitmap => post({ type: 'first', bitmap }, [bitmap]), () => post({ type: 'first', bitmap: null }));
  let last = { goal: Number.NaN, layout: '' };
  let engaged = false;
  let warmed = false;
  return {
    mode: 'worker',
    engage() {
      if (engaged) return;
      engaged = true;
      post({ type: 'engage' });
    },
    allowWarm() {
      if (warmed) return;
      warmed = true;
      post({ type: 'warm' });
    },
    layout(layout) {
      const key = JSON.stringify(layout);
      if (key === last.layout) return;
      last.layout = key;
      post({ type: 'layout', layout });
    },
    seek(goal) {
      if (goal === last.goal) return;
      last.goal = goal;
      post({ type: 'seek', goal });
    },
    rest() { last.goal = Number.NaN; post({ type: 'rest' }); },
    dispose() { worker.terminate(); last = { goal: Number.NaN, layout: '' }; },
  };
}

function startOnPage(canvas: HTMLCanvasElement, poster: HTMLImageElement, profile: RenderProfile, { onReady, onCritical, onShown }: RendererEvents): HeroRenderer | null {
  const context = canvas.getContext('2d', { alpha: false });
  if (!context || typeof createImageBitmap !== 'function') return null;
  const renderer = new FrameRenderer(canvas, context, frameUrls, profile, callback => requestAnimationFrame(callback), handle => cancelAnimationFrame(handle), onReady, onCritical, onShown);
  poster.decode().then(() => renderer.provideFirst(poster), () => renderer.provideFirst(null));
  return {
    mode: 'page',
    layout: layout => renderer.resize(layout),
    seek: goal => renderer.seek(goal),
    engage: () => renderer.engage(),
    allowWarm: () => renderer.allowWarm(),
    rest: () => renderer.rest(),
    dispose: () => renderer.dispose(),
  };
}

/** The hero's renderer: in a worker where supported, otherwise on the page. null = keep the static poster. */
export function createHeroRenderer(canvas: HTMLCanvasElement, poster: HTMLImageElement, profile: RenderProfile, events: RendererEvents): HeroRenderer | null {
  let entry = shared.get(canvas);
  if (entry) {
    clearTimeout(entry.timer);
    // A re-mount (StrictMode) listens through its own callbacks.
    entry.events = events;
  } else {
    // The renderer outlives a re-mount, so it reports through whoever is currently attached.
    const holder: { current?: Shared } = {};
    const forward: RendererEvents = {
      onReady: () => holder.current?.events.onReady(),
      onCritical: () => holder.current?.events.onCritical(),
      onShown: ended => holder.current?.events.onShown(ended),
    };
    const renderer = canUseWorker(canvas) ? startWorker(canvas, poster, profile, forward) : startOnPage(canvas, poster, profile, forward);
    if (!renderer) return null;
    entry = holder.current = { renderer, users: 0, timer: 0, events };
    shared.set(canvas, entry);
  }
  entry.users++;
  const current = entry;
  let released = false;
  return {
    mode: current.renderer.mode,
    layout: layout => current.renderer.layout(layout),
    seek: goal => current.renderer.seek(goal),
    engage: () => current.renderer.engage(),
    allowWarm: () => current.renderer.allowWarm(),
    rest: () => current.renderer.rest(),
    dispose() {
      if (released) return;
      released = true;
      // Deferred, so an immediate re-mount (React StrictMode) keeps the same renderer.
      if (--current.users === 0) current.timer = window.setTimeout(() => { current.renderer.dispose(); shared.delete(canvas); }, 0);
    },
  };
}
