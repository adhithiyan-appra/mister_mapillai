/**
 * Whether the home hero's staged animation has been played to the end, kept in the current history entry (like the scroll
 * position, see scrollRestore.ts). A reload or a back/forward step to that entry keeps the completed hero on its final frame,
 * so the visitor carries on where they were; a new visit to the page (a link, the menu) is a new entry and starts the hero
 * from the beginning. A hero reloaded part-way through starts again from frame 1.
 */
const KEY = 'mmHero';

const entry = (): Record<string, unknown> => (typeof history.state === 'object' && history.state !== null ? history.state as Record<string, unknown> : {});

export function heroCompleted(): boolean {
  return entry()[KEY] === 'done';
}

export function rememberHeroCompleted(completed: boolean) {
  if (heroCompleted() === completed) return;
  try {
    const state = { ...entry() };
    if (completed) state[KEY] = 'done';
    else delete state[KEY];
    history.replaceState(state, '');
  } catch { /* history unavailable or rate-limited: after a reload the hero simply starts from the beginning */ }
}
