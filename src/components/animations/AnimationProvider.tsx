import { createContext, useContext, useLayoutEffect, useRef } from 'react';
import type { ReactNode, RefObject } from 'react';
import { clamp, scrollSmoothing } from '../../utils/animation';

export interface AnimationFrame {
  now: number;
  deltaTime: number;
  scrollY: number;
  width: number;
  height: number;
  reducedMotion: boolean;
}

export interface AnimationRegistration {
  id: string;
  element?: HTMLElement;
  ready?: PromiseLike<unknown>;
  layout?: (frame: AnimationFrame) => void;
  // Reads for all registrations run before any animation writes.
  read?: (frame: AnimationFrame) => void;
  active?: (frame: AnimationFrame) => boolean;
  /** The scene is still on screen although its element has scrolled out of the viewport (e.g. a pinned stage held in place). */
  keepAlive?: () => boolean;
  scrollDriven?: boolean;
  enter?: (frame: AnimationFrame) => void;
  leave?: () => void;
  update: (progress: number, frame: AnimationFrame) => boolean | void;
  dispose?: () => void;
}

interface Scene extends AnimationRegistration {
  top: number;
  height: number;
  current: number;
  visible: boolean;
  continuous: boolean;
  changed: boolean;
  entering: boolean;
  assetsReady: boolean;
}

interface AnimationController {
  register: (registration: AnimationRegistration) => () => void;
  progress: (id: string) => number;
  isReady: (id: string) => boolean;
  invalidate: () => void;
  reset: () => void;
}

function createController(): AnimationController & { start: () => () => void } {
  const scenes = new Map<string, Scene>();
  let entries: Scene[] = [];
  const updates: Scene[] = [];
  const exits: Scene[] = [];
  let raf = 0;
  let lastTime = 0;
  let dirty = true;
  let started = false;
  let reducedMotion = false;
  let initialized = false;
  let lastScrollY = Number.NaN;
  let lastReducedMotion = false;

  function schedule() {
    if (started && !raf && !document.hidden) raf = requestAnimationFrame(tick);
  }

  function invalidate() { dirty = true; schedule(); }

  function tick(now: number) {
    raf = 0;
    const frame: AnimationFrame = {
      now, deltaTime: Math.min(0.1, lastTime ? (now - lastTime) / 1000 : 1 / 60),
      scrollY: window.scrollY, width: innerWidth, height: innerHeight, reducedMotion,
    };
    lastTime = now;
    const geometryChanged = dirty;
    dirty = false;
    if (geometryChanged) {
      // Geometry is cached until resize/content changes, avoiding layout reads on scroll.
      entries.forEach(scene => {
        if (scene.element) {
          const rect = scene.element.getBoundingClientRect();
          scene.top = rect.top + frame.scrollY;
          scene.height = scene.element.offsetHeight;
        }
      });
      entries.forEach(scene => scene.layout?.(frame));
    }
    let running = false;
    let progressChanged = false;
    const scrollChanged = frame.scrollY !== lastScrollY;
    const motionChanged = frame.reducedMotion !== lastReducedMotion;
    updates.length = 0;
    exits.length = 0;
    for (const scene of entries) {
      const inView = !scene.element || scene.keepAlive?.() === true || (scene.top + scene.height >= frame.scrollY - 50 && scene.top <= frame.scrollY + frame.height + 50);
      const eligible = inView && (scene.active?.(frame) ?? true);
      const visible = scene.assetsReady && eligible;
      scene.entering = visible && !scene.visible;
      scene.changed = false;
      if (scene.element) {
        const previous = scene.current;
        const target = clamp((frame.scrollY - scene.top) / Math.max(1, scene.height - frame.height));
        // Keep offscreen scenes synchronized. Scenes marked scrollDriven compute their own
        // scroll progress directly from frame.scrollY, so skipping the shared smoothing loop
        // avoids redundant main-thread rAF ticks after scroll settles.
        if (reducedMotion || scene.scrollDriven || (!eligible && !visible) || (!visible && scene.assetsReady)) scene.current = target;
        else if (!initialized && scene.assetsReady) scene.current = target;
        else if (visible) {
          const gap = target - scene.current;
          scene.current += gap * scrollSmoothing(frame.deltaTime, gap);
        }
        if (Math.abs(target - scene.current) < 0.0002) scene.current = target;
        scene.changed = previous !== scene.current;
        progressChanged ||= scene.changed;
        if (visible && target !== scene.current) running = true;
      }
      if (!visible && scene.visible) { exits.push(scene); scene.continuous = false; }
      scene.visible = visible;
    }
    for (const scene of entries) {
      if (!scene.visible) continue;
      if (geometryChanged || motionChanged || scene.entering || scene.continuous || scene.changed || (scrollChanged && (scene.scrollDriven ?? !scene.element)) || (!scene.element && progressChanged)) updates.push(scene);
    }
    for (const scene of updates) scene.read?.(frame);
    for (const scene of exits) scene.leave?.();
    for (const scene of updates) {
      if (scene.entering) scene.enter?.(frame);
      scene.continuous = scene.update(scene.current, frame) === true;
      running ||= scene.continuous;
    }
    lastScrollY = frame.scrollY;
    lastReducedMotion = frame.reducedMotion;
    initialized = true;
    if (running) schedule();
  }

  return {
    register(registration) {
      const scene: Scene = { ...registration, top: 0, height: 0, current: 0, visible: false, continuous: false, changed: false, entering: false, assetsReady: !registration.ready };
      scenes.set(scene.id, scene);
      entries = [...scenes.values()];
      if (registration.ready) {
        void Promise.resolve(registration.ready).catch(() => undefined).then(() => {
          if (scenes.get(scene.id) !== scene) return;
          scene.assetsReady = true;
          invalidate();
        });
      }
      invalidate();
      return () => {
        scene.leave?.();
        scene.dispose?.();
        if (scenes.get(scene.id) === scene) scenes.delete(scene.id);
        entries = [...scenes.values()];
      };
    },
    progress: id => scenes.get(id)?.current ?? 0,
    isReady: id => scenes.get(id)?.assetsReady ?? false,
    invalidate,
    reset() {
      initialized = false;
      lastScrollY = Number.NaN;
      lastTime = 0;
      for (const scene of scenes.values()) scene.current = 0;
      invalidate();
    },
    start() {
      started = true;
      initialized = false;
      lastScrollY = Number.NaN;
      let live = true;
      const media = matchMedia('(prefers-reduced-motion: reduce)');
      reducedMotion = media.matches;
      const motionChange = () => { reducedMotion = media.matches; invalidate(); };
      const visibility = () => {
        if (document.hidden) { cancelAnimationFrame(raf); raf = 0; }
        else { lastTime = 0; initialized = false; invalidate(); }
      };
      window.addEventListener('scroll', schedule, { passive: true });
      window.addEventListener('resize', invalidate);
      window.addEventListener('orientationchange', invalidate);
      window.visualViewport?.addEventListener('resize', invalidate);
      document.addEventListener('visibilitychange', visibility);
      media.addEventListener('change', motionChange);
      const observer = new ResizeObserver(invalidate);
      observer.observe(document.body);
      document.fonts.ready.then(() => { if (live) invalidate(); });
      invalidate();
      return () => {
        started = false;
        live = false;
        cancelAnimationFrame(raf);
        raf = 0;
        window.removeEventListener('scroll', schedule);
        window.removeEventListener('resize', invalidate);
        window.removeEventListener('orientationchange', invalidate);
        window.visualViewport?.removeEventListener('resize', invalidate);
        document.removeEventListener('visibilitychange', visibility);
        media.removeEventListener('change', motionChange);
        observer.disconnect();
      };
    },
  };
}

const AnimationContext = createContext<AnimationController | null>(null);

export function AnimationProvider({ children }: { children: ReactNode }) {
  const controller = useRef<ReturnType<typeof createController> | null>(null);
  if (!controller.current) controller.current = createController();
  useLayoutEffect(() => controller.current!.start(), []);
  return <AnimationContext value={controller.current}>{children}</AnimationContext>;
}

export function useAnimationController() {
  const controller = useContext(AnimationContext);
  if (!controller) throw new Error('Animation hooks require AnimationProvider.');
  return controller;
}

export function useSceneAnimation<T extends HTMLElement>(
  ref: RefObject<T | null>,
  setup: (element: T, controller: AnimationController) => AnimationRegistration,
) {
  const controller = useAnimationController();
  const setupRef = useRef(setup);
  setupRef.current = setup;
  useLayoutEffect(() => {
    if (!ref.current) return;
    return controller.register(setupRef.current(ref.current, controller));
  }, [controller, ref]);
}
