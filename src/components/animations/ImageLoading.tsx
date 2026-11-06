import { useLayoutEffect } from 'react';
import { prepareImageGroup } from '../../utils/imageLoading';
import { useAnimationController } from './AnimationProvider';

export function ImageLoading() {
  const controller = useAnimationController();
  useLayoutEffect(() => {
    function prepareSection(section: HTMLElement, current = false) {
      if (section.id === 'journey') {
        const chapters = section.querySelectorAll('.ch');
        if (chapters[0]) prepareImageGroup(chapters[0], 'high');
        if (chapters[1]) prepareImageGroup(chapters[1], 'auto');
      } else prepareImageGroup(section, current ? 'high' : 'low');
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
        // Percentage root margins are relative to viewport width, making mobile
        // prefetch too late. Use measured viewport height and enough runway for
        // the original files while the shared queue still limits work to two.
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
    return () => {
      imageObserver?.disconnect();
      unregister();
      document.removeEventListener('click', onNavigate, { capture: true });
    };
  }, [controller]);
  return null;
}
