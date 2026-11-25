/**
 * Scroll restoration for reload and back/forward.
 *
 * Each history entry remembers where it was scrolled (in `history.state`, which survives a reload and belongs to
 * exactly one entry). A reload or a back/forward step puts the visitor back at that position; a new navigation
 * (a link, the menu) is a new entry with nothing saved, so it starts at the top (or at its #hash) as before.
 *
 * The browser's own restoration is switched off at start-up (`manual`) so the two never fight, and the saved
 * position is applied with `behavior: 'instant'` (the site has `scroll-behavior: smooth`).
 *
 * A position is stored as the section under the top of the viewport plus the distance into it, with the raw offset
 * as a fallback. After a reload the page is shorter at first: the Transformation section is pinned by GSAP, which
 * adds a spacer after mount, and fonts and images settle later. So the position is re-applied from the anchor while
 * the page's height settles, and given up the moment the visitor scrolls or touches anything.
 */
import { heroCompleted } from './heroState';

const KEY = 'mmScroll';
/** Longest the restored position is held while the page settles. */
const MAX_HOLD_MS = 5000;
/** No height change for this long (and the page loaded) = settled. */
const QUIET_MS = 700;
/** Pause in scrolling before the position is written to the history entry. */
const SAVE_DELAY_MS = 500;

interface Saved { y: number; i: number; o: number; h: number }

let armed = false;       // the next location belongs to a reload or a back/forward step
let restoreMode: 'document' | 'traversal' | null = null;
let active: { saved: Saved; stop: () => void } | null = null;
let saveTimer = 0;
const navigationType = (performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined)?.type;

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
// Pages render a `.mm` shell inside <main>; keep direct sections as a fallback for pages that do not use that shell.
const sections = () => Array.from(document.querySelectorAll<HTMLElement>('main > section, main > .mm > section'));

function readSaved(): Saved | null {
  const state = history.state;
  const saved = isRecord(state) ? state[KEY] : undefined;
  if (!isRecord(saved)) return null;
  const { y, i, o, h } = saved;
  return [y, i, o, h].every(n => typeof n === 'number' && Number.isFinite(n)) ? { y, i, o, h } as Saved : null;
}

/** Where the visitor is now: the section under the top of the viewport and the distance into it. */
function measure(): Saved {
  const y = Math.max(0, Math.round(window.scrollY));
  const list = sections();
  let i = 0;
  list.forEach((section, index) => { if (section.getBoundingClientRect().top <= 1) i = index; });
  const box = list[i]?.getBoundingClientRect();
  return { y, i, o: box ? Math.max(0, Math.round(-box.top)) : y, h: box ? Math.round(list[i].offsetHeight) : 0 };
}

/** Write the current position into this history entry (never while restoring: the page is not where it will be). */
export function saveScroll() {
  window.clearTimeout(saveTimer);
  if (active || document.documentElement.classList.contains('mm-menu-open')) return;
  try {
    history.replaceState({ ...(isRecord(history.state) ? history.state : {}), [KEY]: measure() }, '');
  } catch { /* history is rate-limited or unavailable: the position is simply not remembered */ }
}

function scheduleSave() {
  window.clearTimeout(saveTimer);
  saveTimer = window.setTimeout(saveScroll, SAVE_DELAY_MS);
}

/** The scroll offset the saved position now corresponds to, from its anchor section (or the raw offset). */
function targetFor(saved: Saved) {
  const section = sections()[saved.i];
  if (!section) return saved.y;
  const top = section.getBoundingClientRect().top + window.scrollY;
  // Saved above the first section (at the very top of the page, where the first section starts below the fixed navigation):
  // restore that offset itself. Anchoring it to the section would push the page down by the navigation's height on reload.
  if (saved.o === 0 && saved.y < top) return Math.max(0, saved.y);
  const height = section.offsetHeight;
  // The section is the same one but its height may differ (another viewport, a late layout): keep the proportion.
  const offset = saved.h > 0 && height > 0 && Math.abs(height - saved.h) > saved.h * 0.1 ? (saved.o / saved.h) * height : saved.o;
  return Math.max(0, Math.round(top + Math.min(offset, height)));
}

function jump(top: number) {
  const root = document.documentElement;
  const previous = root.style.scrollBehavior;
  root.style.scrollBehavior = 'auto';
  window.scrollTo({ top, left: 0, behavior: 'instant' });
  root.style.scrollBehavior = previous;
}

function hold(saved: Saved) {
  const root = document.documentElement;
  const started = performance.now();
  let lastChange = started;
  let lastHeight = root.scrollHeight;
  let frame = 0;
  let observer: ResizeObserver | undefined;

  const apply = () => {
    const target = targetFor(saved);
    if (Math.abs(window.scrollY - target) > 1) jump(target);
  };
  const stop = () => {
    window.cancelAnimationFrame(frame);
    observer?.disconnect();
    INPUT.forEach(type => window.removeEventListener(type, stop, true));
    if (active?.stop === stop) active = null;
    // Remember where the visitor ended up now that the position is real.
    scheduleSave();
  };
  // The visitor takes over: wheel, touch, keys, pointer. Nothing is re-applied after that.
  const INPUT = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const;
  INPUT.forEach(type => window.addEventListener(type, stop, { capture: true, passive: true, once: true }));

  const tick = (now: number) => {
    const height = root.scrollHeight;
    if (height !== lastHeight) { lastHeight = height; lastChange = now; }
    apply();
    const settled = document.readyState === 'complete' && now - lastChange > QUIET_MS;
    if (settled || now - started > MAX_HOLD_MS) stop(); else frame = window.requestAnimationFrame(tick);
  };
  apply();
  frame = window.requestAnimationFrame(tick);
  if (typeof ResizeObserver === 'function') {
    observer = new ResizeObserver(() => { lastChange = performance.now(); apply(); });
    observer.observe(document.body);
  }
  active = { saved, stop };
}

/** Call once, before the app renders. */
export function initScrollRestoration() {
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  armed = true; // the first location of a visit is a load or a reload: restore it if this entry has a position
  restoreMode = 'document';
  window.addEventListener('scroll', scheduleSave, { passive: true });
  window.addEventListener('pagehide', saveScroll);
  window.addEventListener('beforeunload', saveScroll);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') saveScroll(); });
}

/** The next location is a back/forward step: its entry may have a saved position. */
export function expectTraversal() {
  active?.stop();
  armed = true;
  restoreMode = 'traversal';
}

/** The visitor is navigating somewhere new: remember this entry's position, and start the new one fresh. */
export function leavingForNewLocation() {
  saveScroll();
  active?.stop();
  armed = false;
  restoreMode = null;
}

/** Cancel any in-progress or armed scroll restoration (e.g. explicit scroll-to-top click). */
export function cancelScrollRestore() {
  active?.stop();
  armed = false;
  restoreMode = null;
}

/**
 * Called when a location has rendered. Puts the visitor back at the entry's saved position and returns true, or
 * returns false when there is nothing to restore (a new navigation, a first visit): the caller scrolls as usual.
 * Safe to call twice for one location (React StrictMode re-runs effects in development).
 */
export function restoreScroll(): boolean {
  if (active) return true;
  if (!armed) return false;
  armed = false;
  const mode = restoreMode;
  restoreMode = null;
  const saved = readSaved();
  if (!saved) return false;
  const anchor = sections()[saved.i];
  // A reload inside the home hero while its animation is unfinished starts it again from frame 1, at the top of the page. Keep
  // the site's normal restoration for every other section, for browser history traversal, and for a hero already played to the
  // end (utils/heroState.ts): that one stays complete and the visitor is put back exactly where they were.
  if (mode === 'document' && navigationType === 'reload' && anchor?.classList.contains('mm-hero-seq') && !heroCompleted()) {
    jump(0);
    try {
      history.replaceState({ ...(isRecord(history.state) ? history.state : {}), [KEY]: { y: 0, i: saved.i, o: 0, h: anchor.offsetHeight } satisfies Saved }, '');
    } catch { /* the top position is already applied; failing to rewrite history is harmless */ }
    return true;
  }
  hold(saved);
  return true;
}
