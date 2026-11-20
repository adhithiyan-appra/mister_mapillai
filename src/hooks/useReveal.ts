import { useEffect } from 'react';
import type { RefObject } from 'react';

const SELECTOR = '.mm-reveal:not(.is-in)';

/**
 * The observer's root reaches this far above the viewport, so everything above the viewport counts as intersecting.
 * An observer is only told when an element's intersection changes: an element that jumps from below the viewport to
 * above it between two frames (dragging the scrollbar, an instant scrollTo) never touches the viewport and would stay
 * hidden. With the root extended upward that jump is a change, and the element is revealed at once, off screen.
 * The same covers a page opened part-way down, and an element taller than the viewport, whose 15% can't otherwise
 * be reached: it is revealed once enough of it has scrolled past.
 */
const ABOVE = '100000px 0px 0px 0px';

/**
 * Scroll reveal, as in the reference page: adds `is-in` to every `.mm-reveal` inside the root the first time 15% of
 * it is in the viewport, then stops watching it (one observer, one-shot). Elements rendered later (filter changes,
 * step changes) are picked up by a mutation observer that looks only at the nodes that were added, once per frame.
 */
export function useReveal(root: RefObject<HTMLElement | null>, key: unknown) {
  useEffect(() => {
    const container = root.current;
    if (!container) return;
    const reveal = (node: Element) => node.classList.add('is-in');
    // The nodes in `node`'s subtree (and itself) that still need revealing.
    const collect = (node: Node, found: Element[]) => {
      if (!(node instanceof Element)) return;
      if (node.matches(SELECTOR)) found.push(node);
      node.querySelectorAll(SELECTOR).forEach(element => found.push(element));
    };
    let pending: Node[] = [];
    let frame = 0;
    const settle = (watch: (node: Element) => void) => {
      frame = 0;
      const found: Element[] = [];
      pending.forEach(node => collect(node, found));
      pending = [];
      found.forEach(watch);
    };
    const onMutations = (watch: (node: Element) => void) => (records: MutationRecord[]) => {
      records.forEach(record => record.addedNodes.forEach(node => pending.push(node)));
      if (!frame) frame = requestAnimationFrame(() => settle(watch));
    };

    if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      container.querySelectorAll(SELECTOR).forEach(reveal);
      const mutations = new MutationObserver(onMutations(reveal));
      mutations.observe(container, { childList: true, subtree: true });
      return () => {
        cancelAnimationFrame(frame);
        mutations.disconnect();
      };
    }

    const observed = new WeakSet<Element>();
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        reveal(entry.target);
        observer.unobserve(entry.target);
      });
    }, { threshold: 0.15, rootMargin: ABOVE });
    const watch = (node: Element) => {
      if (observed.has(node)) return;
      observed.add(node);
      observer.observe(node);
    };
    container.querySelectorAll(SELECTOR).forEach(watch);
    const mutations = new MutationObserver(onMutations(watch));
    mutations.observe(container, { childList: true, subtree: true });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      mutations.disconnect();
    };
  }, [root, key]);
}
