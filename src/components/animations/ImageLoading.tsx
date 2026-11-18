import { useLayoutEffect } from 'react';
import { prepareImageGroup } from '../../utils/imageLoading';
import { useAnimationController } from './AnimationProvider';
import { onHeroReady } from '../../utils/heroReady';

export function ImageLoading({ routeKey }: { routeKey: string }) {
  const controller = useAnimationController();
  useLayoutEffect(() => {
    // On a first home visit, page images start once the hero's opening frames are ready.
    let teardown = () => {};
    const stop = onHeroReady(() => { teardown = start(); });
    return () => { stop(); teardown(); };
  }, [controller, routeKey]);

  function start() {
    let live = true;
    const invalidateWhenReady = (readiness: Promise<unknown>) => {
      void readiness.then(() => { if (live) controller.invalidate(); });
    };
    function prepareSection(section: HTMLElement, current = false) {
      invalidateWhenReady(prepareImageGroup(section, current ? 'high' : 'low'));
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
      const target = anchor.hash ? document.getElementById(anchor.hash.slice(1)) : null;
      if (target) prepareSection(target, true);
    };
    document.addEventListener('click', onNavigate, { capture: true });
    const initial = location.hash ? document.getElementById(location.hash.slice(1)) : null;
    if (initial) prepareSection(initial, true);
    if (!location.hash) {
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
  }
  return null;
}
