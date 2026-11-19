/**
 * Hero frame sequence: frame URLs, device budgets and the renderer factory.
 *
 * The frames are full-resolution web encodings (1920×1088) of the originals in
 * src/assets/animations/hero-frames/source, produced in the same order by
 * scripts/build-hero-frames.py. Rendering runs in a worker on an
 * OffscreenCanvas where supported, otherwise on the page (see frameRenderer.ts).
 */
import { FrameRenderer } from './frameRenderer';
import type { RenderLayout, RenderProfile } from './frameRenderer';
import type { WorkerMessage, WorkerReply } from './frameRenderer.worker';

export type { RenderLayout } from './frameRenderer';

export const frameUrls: readonly string[] = Object.entries(
  import.meta.glob<string>('../../assets/animations/hero-frames/web/*.webp', { eager: true, query: '?url', import: 'default' }),
)
  .map(([path, url]) => ({ n: Number(path.match(/(\d+)\.webp$/)?.[1] ?? NaN), url: new URL(url, document.baseURI).href }))
  .filter(frame => Number.isFinite(frame.n))
  .sort((a, b) => a.n - b.n)
  .map(frame => frame.url);

/** Source frame size (all frames share it); refined from the poster once it loads. */
export const SOURCE_SIZE = { width: 1920, height: 1088 } as const;

interface DeviceHints extends Navigator {
  deviceMemory?: number;
  connection?: { saveData?: boolean };
}

/** Budgets for decoded memory and work. Every device gets the full-resolution frames. */
export function deviceProfile(): RenderProfile & { maxDpr: number; maxArea: number } {
  const nav = navigator as DeviceHints;
  const lowPower = Boolean(nav.connection?.saveData) || (nav.deviceMemory ?? 8) <= 4 || (nav.hardwareConcurrency ?? 8) <= 4;
  return {
    maxDpr: lowPower ? 1.5 : 2,
    /** Canvas backing-store budget in device pixels. */
    maxArea: lowPower ? 2_300_000 : 4_200_000,
    fetchConcurrency: 4,
    decodeConcurrency: lowPower ? 2 : 4,
    // ~27 decoded frames on desktop (full resolution, ~225 MB); ~17 smaller ones on low-power devices.
    // The window ahead covers the renderer's lookahead plus the frames still in the decoder at the top playhead speed.
    ahead: lowPower ? 10 : 14,
    behind: lowPower ? 2 : 3,
    keyStride: lowPower ? 40 : 32,
    // The footage never plays faster than ~3x its natural pace, however hard the page is flung.
    maxSpeed: lowPower ? 48 : 72,
    // ~0.22 s glide: starts and stops without a jolt, trails the scroll by about a fifth of a second.
    glide: 0.22,
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
  /** The hero is off screen: release the decoded window; the next seek brings it back. */
  rest(): void;
  dispose(): void;
}

interface Shared { renderer: HeroRenderer; users: number; timer: number }
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
}

function startWorker(canvas: HTMLCanvasElement, poster: HTMLImageElement, profile: RenderProfile, { onReady, onCritical }: RendererEvents): HeroRenderer {
  const worker = new Worker(new URL('./frameRenderer.worker.ts', import.meta.url), { type: 'module' });
  const post = (message: WorkerMessage, transfer: Transferable[] = []) => worker.postMessage(message, transfer);
  worker.onmessage = ({ data }: MessageEvent<WorkerReply>) => {
    if (data.type === 'ready') onReady();
    else if (data.type === 'critical') onCritical();
  };
  const offscreen = canvas.transferControlToOffscreen();
  post({ type: 'init', canvas: offscreen, urls: frameUrls, profile }, [offscreen]);
  // Frame 1 is the poster the page already loaded: pass its pixels instead of fetching it again.
  poster.decode()
    .then(() => createImageBitmap(poster))
    .then(bitmap => post({ type: 'first', bitmap }, [bitmap]), () => post({ type: 'first', bitmap: null }));
  let last = { goal: Number.NaN, layout: '' };
  return {
    mode: 'worker',
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

function startOnPage(canvas: HTMLCanvasElement, poster: HTMLImageElement, profile: RenderProfile, { onReady, onCritical }: RendererEvents): HeroRenderer | null {
  const context = canvas.getContext('2d', { alpha: false });
  if (!context || typeof createImageBitmap !== 'function') return null;
  const renderer = new FrameRenderer(canvas, context, frameUrls, profile, callback => requestAnimationFrame(callback), handle => cancelAnimationFrame(handle), onReady, onCritical);
  poster.decode().then(() => renderer.provideFirst(poster), () => renderer.provideFirst(null));
  return {
    mode: 'page',
    layout: layout => renderer.resize(layout),
    seek: goal => renderer.seek(goal),
    rest: () => renderer.rest(),
    dispose: () => renderer.dispose(),
  };
}

/** The hero's renderer: in a worker where supported, otherwise on the page. null = keep the static poster. */
export function createHeroRenderer(canvas: HTMLCanvasElement, poster: HTMLImageElement, profile: RenderProfile, events: RendererEvents): HeroRenderer | null {
  let entry = shared.get(canvas);
  if (entry) {
    clearTimeout(entry.timer);
  } else {
    const renderer = canUseWorker(canvas) ? startWorker(canvas, poster, profile, events) : startOnPage(canvas, poster, profile, events);
    if (!renderer) return null;
    entry = { renderer, users: 0, timer: 0 };
    shared.set(canvas, entry);
  }
  entry.users++;
  const current = entry;
  let released = false;
  return {
    mode: current.renderer.mode,
    layout: layout => current.renderer.layout(layout),
    seek: goal => current.renderer.seek(goal),
    rest: () => current.renderer.rest(),
    dispose() {
      if (released) return;
      released = true;
      // Deferred, so an immediate re-mount (React StrictMode) keeps the same renderer.
      if (--current.users === 0) current.timer = window.setTimeout(() => { current.renderer.dispose(); shared.delete(canvas); }, 0);
    },
  };
}
