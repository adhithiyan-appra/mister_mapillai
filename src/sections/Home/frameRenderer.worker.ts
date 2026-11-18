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
  | { type: 'show'; target: number; direction: number }
  | { type: 'dispose' };

export type WorkerReply = { type: 'ready' } | { type: 'critical' } | { type: 'failed' };

// Minimal worker-scope typing (the project's TS lib is DOM, not WebWorker).
interface WorkerScope {
  onmessage: ((event: MessageEvent<WorkerMessage>) => void) | null;
  postMessage(message: WorkerReply): void;
  close(): void;
  requestAnimationFrame?: (callback: () => void) => number;
  cancelAnimationFrame?: (handle: number) => void;
}
const scope = self as unknown as WorkerScope;

let renderer: FrameRenderer | null = null;

scope.onmessage = ({ data }) => {
  switch (data.type) {
    case 'init': {
      const context = data.canvas.getContext('2d', { alpha: false });
      if (!context) { scope.postMessage({ type: 'failed' }); return; }
      // Worker rAF where available (Chrome, Firefox, Safari 16.4+); otherwise the next task.
      const schedule = scope.requestAnimationFrame
        ? (callback: () => void) => scope.requestAnimationFrame!(callback)
        : (callback: () => void) => setTimeout(callback, 0) as unknown as number;
      const cancel = scope.cancelAnimationFrame ? (handle: number) => scope.cancelAnimationFrame!(handle) : (handle: number) => clearTimeout(handle);
      renderer = new FrameRenderer(data.canvas, context, data.urls, data.profile, schedule, cancel, () => scope.postMessage({ type: 'ready' }), () => scope.postMessage({ type: 'critical' }));
      break;
    }
    case 'first': renderer?.provideFirst(data.bitmap); break;
    case 'layout': renderer?.resize(data.layout); break;
    case 'show': renderer?.show(data.target, data.direction); break;
    case 'dispose':
      renderer?.dispose();
      renderer = null;
      scope.close();
      break;
  }
};
