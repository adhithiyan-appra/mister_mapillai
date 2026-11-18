import { useEffect } from 'react';
import type { RefObject } from 'react';

const SELECTOR = '.mm-reveal:not(.is-in)';

/**
 * Template scroll reveal: adds `is-in` to every `.mm-reveal` inside the root
 * once it enters the viewport. One observer per page; elements rendered later
 * (filter changes, step changes) are picked up by a mutation observer.
 */
export function useReveal(root: RefObject<HTMLElement | null>, key: unknown) {
  useEffect(() => {
    const container = root.current;
    if (!container) return;
    const reveal = (node: Element) => node.classList.add('is-in');
    if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      container.querySelectorAll(SELECTOR).forEach(reveal);
      const mutations = new MutationObserver(() => container.querySelectorAll(SELECTOR).forEach(reveal));
      mutations.observe(container, { childList: true, subtree: true });
      return () => mutations.disconnect();
    }
    const observed = new WeakSet<Element>();
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        reveal(entry.target);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    const scan = () => container.querySelectorAll(SELECTOR).forEach(node => {
      if (observed.has(node)) return;
      observed.add(node);
      observer.observe(node);
    });
    scan();
    const mutations = new MutationObserver(scan);
    mutations.observe(container, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
      mutations.disconnect();
    };
  }, [root, key]);
}
