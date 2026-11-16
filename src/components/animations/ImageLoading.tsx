import { useLayoutEffect } from 'react';
import { prepareImageGroup } from '../../utils/imageLoading';
import { useAnimationController } from './AnimationProvider';

export function ImageLoading({ routeKey }: { routeKey: string }) {
  const controller = useAnimationController();
  useLayoutEffect(() => {
    let live = true;
    const invalidateWhenReady = (readiness: Promise<unknown>) => {
      void readiness.then(() => { if (live) controller.invalidate(); });
    };
    function prepareSection(section: HTMLElement, current = false) {
      const readiness: Promise<unknown>[] = [];
      if (section.id === 'journey') {
        const chapters = section.querySelectorAll('.ch');
        if (chapters[0]) readiness.push(prepareImageGroup(chapters[0], 'high'));
        if (chapters[1]) readiness.push(prepareImageGroup(chapters[1], 'auto'));
      } else readiness.push(prepareImageGroup(section, current ? 'high' : 'low'));
      invalidateWhenReady(Promise.all(readiness));
    }
    const sections = document.querySelectorAll<HTMLElement>('main > section');
    let imageObserver: IntersectionObserver | undefined;
    const preparedSections = new WeakSet<Element>();
    let preparedHeight = 0;
    const unregister = controller.register({
      id: 'image-loading', active: () => false,
      layout(frame) {
        if (preparedHeight === frame.height) return;
        preparedHeight = frame.height;
        imageObserver?.disconnect();
        // Requests already started at bootstrap. This observer only promotes
        // approaching groups inside the bounded decode queue.
        imageObserver = new IntersectionObserver(entries => {
          entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            prepareSection(entry.target as HTMLElement);
            preparedSections.add(entry.target);
            imageObserver!.unobserve(entry.target);
          });
        }, { rootMargin: `${frame.height * 8}px 0px` });
        sections.forEach(section => { if (!preparedSections.has(section)) imageObserver!.observe(section); });
      },
      update() {},
    });
    // Start loading an anchor's destination before the browser jumps there.
    const onNavigate = (event: MouseEvent) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>('a[href^="#"]') : null;
      if (!anchor) return;
      const target = document.getElementById(anchor.hash.slice(1) || 'journey');
      if (target) prepareSection(target, true);
    };
    document.addEventListener('click', onNavigate, { capture: true });
    const initial = document.getElementById(location.hash.slice(1) || 'journey');
    if (initial) prepareSection(initial, true);
    if (!location.hash || location.hash === '#journey') {
      const about = document.getElementById('about');
      if (about) prepareSection(about);
    }
    // Attach every mounted image/background to the URL-level registry now;
    // scrolling no longer controls whether a resource is requested or decoded.
    invalidateWhenReady(prepareImageGroup(document, 'low'));
    return () => {
      live = false;
      imageObserver?.disconnect();
      unregister();
      document.removeEventListener('click', onNavigate, { capture: true });
    };
  }, [controller, routeKey]);
  return null;
}
