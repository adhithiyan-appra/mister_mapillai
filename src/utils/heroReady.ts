/**
 * One-shot signal from the home hero: the opening frames of the cinematic
 * sequence are decoded (or the hero needs none, e.g. with reduced motion).
 *
 * On a first visit to the home page, the loader waits for it and the rest of
 * the page's images are held back until then, so the hero has the network to
 * itself. It fires at the latest HERO_CAP_MS after navigation start, so slow
 * connections are never held longer. Other first pages have nothing to wait for.
 */
export const HERO_CAP_MS = 6000;

const firstPageIsHome = (window.location.pathname.replace(/\/+$/, '') || '/') === '/';
let ready = !firstPageIsHome;
const listeners = new Set<() => void>();

export function markHeroReady() {
  if (ready) return;
  ready = true;
  listeners.forEach(listener => listener());
  listeners.clear();
}

if (!ready) window.setTimeout(markHeroReady, Math.max(0, HERO_CAP_MS - performance.now()));

/** True while the home hero's opening frames are still loading on the first visit. */
export function heroPending() {
  return !ready;
}

/** Calls `listener` once the hero is ready (immediately if it already is). Returns an unsubscribe. */
export function onHeroReady(listener: () => void): () => void {
  if (ready) { listener(); return () => {}; }
  listeners.add(listener);
  return () => listeners.delete(listener);
}
