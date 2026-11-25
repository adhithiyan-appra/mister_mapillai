/**
 * Hero frame worker: owns the hero canvas (transferred as an OffscreenCanvas),
 * fetches, decodes, uploads and draws frames, so none of that image work runs
 * on the page's main thread. The page only posts the wanted frame and layout.
 */
import { FrameRenderer } from './frameRenderer';
import type { RenderLayout, RenderProfile } from './frameRenderer';

export type WorkerMessage =
  | { type: 'init'; canvas: OffscreenCanvas; urls: readonly string[]; profile: RenderProfile }
  | { type: 'first'; bitmap: ImageBitmap | null }
  | { type: 'layout'; layout: RenderLayout }
  | { type: 'seek'; goal: number }
  | { type: 'play'; from: number; to: number; ms: number; delay: number; blend: boolean }
  | { type: 'prepare'; ranges: [number, number][] }
  | { type: 'engage' }
  | { type: 'warm' }
  | { type: 'rest' }
  | { type: 'dispose' };

export type WorkerReply =
  | { type: 'ready' }
  | { type: 'critical' }
  | { type: 'failed' }
  | { type: 'played'; at: number };

// Minimal worker-scope typing (the project's TS lib is DOM, not WebWorker).
interface WorkerScope {
  onmessage: ((event: MessageEvent<WorkerMessage>) => void) | null;
  postMessage(message: WorkerReply): void;
  close(): void;
  requestAnimationFrame?: (callback: (now: number) => void) => number;
  cancelAnimationFrame?: (handle: number) => void;
}
const scope = self as unknown as WorkerScope;

let renderer: FrameRenderer | null = null;

scope.onmessage = ({ data }) => {
  switch (data.type) {
    case 'init': {
      const context = data.canvas.getContext('2d', { alpha: false });
      if (!context || typeof createImageBitmap !== 'function') { scope.postMessage({ type: 'failed' }); return; }
      // Worker rAF where available (Chrome, Firefox, Safari 16.4+), so the playhead steps once per display
      // frame; otherwise a 60 Hz timer.
      const schedule = scope.requestAnimationFrame
        ? (callback: (now: number) => void) => scope.requestAnimationFrame!(callback)
        : (callback: (now: number) => void) => setTimeout(() => callback(performance.now()), 16) as unknown as number;
      const cancel = scope.cancelAnimationFrame ? (handle: number) => scope.cancelAnimationFrame!(handle) : (handle: number) => clearTimeout(handle);
      renderer = new FrameRenderer(
        data.canvas, context, data.urls, data.profile, schedule, cancel,
        () => scope.postMessage({ type: 'ready' }),
        () => scope.postMessage({ type: 'critical' }),
        at => scope.postMessage({ type: 'played', at }),
      );
      break;
    }
    case 'first': renderer?.provideFirst(data.bitmap); break;
    case 'layout': renderer?.resize(data.layout); break;
    case 'seek': renderer?.seek(data.goal); break;
    case 'play': renderer?.play(data.from, data.to, data.ms, data.delay, data.blend); break;
    case 'prepare': renderer?.prepare(data.ranges); break;
    case 'engage': renderer?.engage(); break;
    case 'warm': renderer?.allowWarm(); break;
    case 'rest': renderer?.rest(); break;
    case 'dispose':
      renderer?.dispose();
      renderer = null;
      scope.close();
      break;
  }
};
