/**
 * Hero frame sequence: frame URLs, device budgets and the renderer factory.
 *
 * The frames are the V3 sequence (hero-frames/v3, 203 PNG frames) as lossless WebP (1920×1088, pixel-identical to the PNGs),
 * produced in the same order by scripts/build-hero-frames.py (webp_v3/manifest.json lists that order). Every device gets these
 * full-resolution frames. Lossless frames are large (~0.85 MB each), so only the frames around the playing stage are fetched (see
 * FrameStore in frameRenderer.ts). Rendering runs in a worker on an OffscreenCanvas where supported, otherwise on the page.
 */
import { FrameRenderer } from './frameRenderer';
import type { RenderLayout, RenderProfile } from './frameRenderer';
import type { WorkerMessage, WorkerReply } from './frameRenderer.worker';

export type { RenderLayout } from './frameRenderer';

export const frameUrls: readonly string[] = Object.entries(
  import.meta.glob<string>('../../assets/animations/hero-frames/webp_v3/*.webp', { eager: true, query: '?url', import: 'default' }),
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

/** Budgets for decoded memory and work. */
export function deviceProfile(): RenderProfile & { maxDpr: number; maxArea: number } {
  const nav = navigator as DeviceHints;
  const saveData = Boolean(nav.connection?.saveData);
  const lowPower = saveData || (nav.deviceMemory ?? 8) <= 4 || (nav.hardwareConcurrency ?? 8) <= 4;
  // Use fewer simultaneous requests on a constrained link. Frame one always has priority over stage prefetching.
  const slowLink = saveData || /^(slow-2g|2g|3g)$/.test(nav.connection?.effectiveType ?? '');
  // A phone loaded in landscape is wider than the old width-only query. Short coarse-pointer viewports still use phone budgets,
  // avoiding desktop-sized bitmap windows when a visitor enters the page after rotating their device.
  const phone = matchMedia('(max-width: 600px), (max-height: 600px) and (pointer: coarse)').matches;
  const touchSized = matchMedia('(max-width: 1023px), (max-height: 700px) and (pointer: coarse)').matches;
  return {
    // Sharpness first: the canvas has exactly as many pixels as the screen shows (see HeroSection's layout), so the frame is never
    // drawn small and then stretched by the browser. The earlier caps (2x, 1.5x on "low-power" devices, and a 2.3-4.2 MP area
    // budget) drew a 3x phone's frame at 1/2-2/3 of its screen resolution: visibly soft.
    maxDpr: 3,
    /** Canvas backing-store ceiling in device pixels: a safety net only, above any real phone, tablet, laptop or 4K screen at 150%. */
    maxArea: lowPower ? 6_000_000 : 8_300_000,
    fetchConcurrency: slowLink ? 2 : lowPower ? 4 : 6,
    // Encoded frames kept ready beyond the decoded window (ahead and behind the playhead) so forward
    // and reverse scrolling never stall waiting on cold network fetches, while capping RAM safely.
    prefetch: lowPower || phone ? 4 : 8,
    prefetchBehind: 4,
    // Low-priority opening frames begin only after frame 1 has arrived, so they build a runway without delaying the poster.
    warm: 4,
    // Keep full-resolution frames on every device. Bound memory by retaining fewer bitmaps on phones.
    decodeConcurrency: lowPower || phone ? 2 : 3,
    ahead: lowPower || phone ? 7 : 10,
    behind: 4,
    startBuffer: 5,
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
  /** Play a stage from frame `from` to `to` (0-based) over `ms`, its nominal length (see FrameRenderer.play). */
  play(from: number, to: number, ms: number): void;
  /** Stages that may be played next (0-based ranges): fetch their frames ahead of time. */
  prepare(ranges: [number, number][]): void;
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
  /** A stage has finished: its last frame (0-based) is on the canvas, whole. */
  onPlayed: (position: number) => void;
  /** The renderer could not start (no canvas context in the worker): the frames will not play. */
  onFailed: () => void;
  /** A frame has downloaded or decoded (at most twice a second): the frames are still coming. */
  onProgress: () => void;
}

function startWorker(canvas: HTMLCanvasElement, poster: HTMLImageElement, profile: RenderProfile, { onReady, onCritical, onPlayed, onFailed, onProgress }: RendererEvents): HeroRenderer {
  const worker = new Worker(new URL('./frameRenderer.worker.ts', import.meta.url), { type: 'module' });
  let disposed = false;
  const fail = () => { if (!disposed) { onCritical(); onFailed(); } };
  worker.onerror = fail;
  const post = (message: WorkerMessage, transfer: Transferable[] = []) => worker.postMessage(message, transfer);
  worker.onmessage = ({ data }: MessageEvent<WorkerReply>) => {
    if (data.type === 'ready') onReady();
    else if (data.type === 'critical') onCritical();
    else if (data.type === 'failed') fail();
    else if (data.type === 'played') onPlayed(data.at);
    else if (data.type === 'progress') onProgress();
  };
  const offscreen = canvas.transferControlToOffscreen();
  post({ type: 'init', canvas: offscreen, urls: frameUrls, profile }, [offscreen]);
  // Frame 1 is the poster the page already loaded: pass its pixels instead of fetching it again.
  poster.decode()
    .then(() => createImageBitmap(poster))
    .then(bitmap => {
      if (disposed) bitmap.close();
      else post({ type: 'first', bitmap }, [bitmap]);
    }, () => { if (!disposed) post({ type: 'first', bitmap: null }); });
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
    // A stage moves the playhead in the worker, so the next seek must be sent even if it repeats the last one.
    play(from, to, ms) { last.goal = Number.NaN; post({ type: 'play', from, to, ms }); },
    prepare(ranges) { post({ type: 'prepare', ranges }); },
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
    dispose() { disposed = true; worker.terminate(); },
  };
}

function startOnPage(canvas: HTMLCanvasElement, poster: HTMLImageElement, profile: RenderProfile, { onReady, onCritical, onPlayed, onProgress }: RendererEvents): HeroRenderer | null {
  if (typeof createImageBitmap !== 'function') return null;
  let renderer: FrameRenderer;
  try {
    renderer = new FrameRenderer(canvas, frameUrls, { ...profile, decodeConcurrency: 1 }, callback => requestAnimationFrame(callback), handle => cancelAnimationFrame(handle), onReady, onCritical, onPlayed, onProgress);
  } catch {
    return null;
  }
  poster.decode().then(() => renderer.provideFirst(poster), () => renderer.provideFirst(null));
  return {
    mode: 'page',
    layout: layout => renderer.resize(layout),
    seek: goal => renderer.seek(goal),
    engage: () => renderer.engage(),
    play: (from, to, ms) => renderer.play(from, to, ms),
    prepare: ranges => renderer.prepare(ranges),
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
      onPlayed: at => holder.current?.events.onPlayed(at),
      onFailed: () => holder.current?.events.onFailed(),
      onProgress: () => holder.current?.events.onProgress(),
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
    play: (from, to, ms) => current.renderer.play(from, to, ms),
    prepare: ranges => current.renderer.prepare(ranges),
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
