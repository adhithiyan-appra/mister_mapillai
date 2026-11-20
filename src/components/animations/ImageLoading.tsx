import { useLayoutEffect } from 'react';
import { prepareImageElement, prepareImageGroup } from '../../utils/imageLoading';
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
        // A section's images are requested when the section comes within ~2.5 screens of the viewport
        // (the ones on screen first, at high priority), so a page only downloads what it is about to
        // show. Requests then go through the bounded decode queue.
        const viewportHeight = frame.height;
        imageObserver = new IntersectionObserver(entries => {
          entries.forEach(entry => {
            if (!entry.isIntersecting) return;
            const box = entry.boundingClientRect;
            prepareSection(entry.target as HTMLElement, box.bottom > 0 && box.top < viewportHeight);
            preparedSections.add(entry.target);
            imageObserver!.unobserve(entry.target);
          });
        }, { rootMargin: `${Math.round(viewportHeight * 2.5)}px 0px` });
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
    // Deferred images outside any page section (none today) are prepared at once, so nothing is left
    // waiting for an observer. Everything inside a section waits for the section to come near.
    document.querySelectorAll<HTMLImageElement>('img[data-image-src]').forEach(image => {
      if (!image.closest('main > section')) invalidateWhenReady(prepareImageElement(image, 'low'));
    });
    return () => {
      live = false;
      imageObserver?.disconnect();
      unregister();
      document.removeEventListener('click', onNavigate, { capture: true });
    };
  }
  return null;
}
