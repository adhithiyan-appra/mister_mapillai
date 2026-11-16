import { useRef, useState } from 'react';
import { flushSync } from 'react-dom';
import type { KeyboardEvent } from 'react';
import { SourceImage } from '../../components/common/SourceImage';
import { Button } from '../../components/common/Button';
import { useSceneAnimation } from '../../components/animations/AnimationProvider';
import { clamp, ease, element, elements, scrollSmoothing, writeStyle } from '../../utils/animation';
import { prepareImageGroup } from '../../utils/imageLoading';
import { isOutfitFilter, occasionText, outfitFilters, outfits, outfitsFor } from '../../data/outfits';
import type { OutfitFilter } from '../../data/outfits';

/** Height of the fixed site header; the showcase pins just below it. */
const HEADER = 78;
/** Page scroll that turns the ring by one look, as a fraction of the viewport height. */
const PER_LOOK = 0.5;
/** Degrees of rotation per pixel dragged (as in the reference). */
const DRAG_GAIN = 0.25;
/** Each half of a filter change: the current ring fades out, the new one fades in. */
const FADE = 260;
/** Stacked layouts (phones, portrait tablets) use the compact pinned view. */
const STACKED = 900;

const indicesFor = (filter: OutfitFilter) => outfitsFor(filter).map(outfit => outfits.indexOf(outfit));

function initialFilter(): OutfitFilter {
  const value = new URLSearchParams(window.location.search).get('occasion') ?? 'all';
  return isOutfitFilter(value) ? value : 'all';
}

interface RingApi {
  select: (filter: OutfitFilter) => void;
  step: (delta: number) => void;
}

interface View { filter: OutfitFilter; id: string }

export function Collection() {
  const ref = useRef<HTMLElement>(null);
  const api = useRef<RingApi | null>(null);
  // `filter` is the pressed button; `view` is what the ring and panel show. They
  // differ only while the previous ring fades out, so the panel never describes
  // a look that is not on the stage.
  const [filter, setFilter] = useState<OutfitFilter>(initialFilter);
  const [view, setView] = useState<View>(() => ({ filter, id: outfitsFor(filter)[0].id }));
  const list = outfitsFor(view.filter);
  const index = Math.max(0, list.findIndex(outfit => outfit.id === view.id));
  const look = list[index];

  useSceneAnimation(ref, (section, controller) => {
    const track = element(section, '.cr-track');
    const pin = element(section, '.cr-pin');
    const stage = element(section, '.cr-stage');
    const ring = element(section, '.cr-ring');
    const cards = elements(ring, '.cr-look');
    const images = cards.map(card => element<HTMLImageElement>(card, 'img'));
    const shades = cards.map(card => element(card, '.cr-shade'));
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    const now = () => performance.now();

    let shown = filter;
    let members = indicesFor(shown);
    let count = members.length, step = 360 / count, radius = 0, width = 200;
    // Scroll geometry (document coordinates), measured in layout().
    let pinStart = 0, span = 1, perLook = 400, viewport = 800;
    // Rotation progress through the set: 0 = first look in front, 1 = last.
    let progress = 0, synced = false;
    let front = -1, frontCard = -1;
    let fade: { start: number; next: OutfitFilter; swapped: boolean } | null = null;
    let drag: { id: number; x: number; from: number; moved: number } | null = null;
    let suppressClick = false;
    let requested: { slot: number; at: number } | null = null;
    const upgraded = new Set<number>();

    const scrollFor = (slot: number) => pinStart + (count > 1 ? span * slot / (count - 1) : 0);
    const progressAt = (scrollY: number) => (count > 1 ? clamp((scrollY - pinStart) / span) : 0);
    const angleAt = (p: number) => {
      // Reduced motion: the ring steps from look to look instead of turning.
      const position = p * (count - 1);
      return -(reduced.matches ? Math.round(position) : position) * step;
    };

    function scrollTo(top: number, smooth: boolean) {
      const goal = Math.round(top);
      if (Math.abs(window.scrollY - goal) < 1) return;
      window.scrollTo({ top: goal, behavior: smooth && !reduced.matches ? 'smooth' : 'instant' });
    }

    function arrange() {
      count = members.length;
      step = 360 / count;
      radius = Math.round((width / 2) / Math.tan(Math.PI / Math.max(count, 3))) + width * (count < 6 ? 0.9 : 0.32);
      const slot = new Map(members.map((card, i) => [card, i]));
      cards.forEach((card, i) => {
        const at = slot.get(i);
        if (at === undefined) { writeStyle(card, 'visibility', 'hidden'); writeStyle(card, 'opacity', '0'); return; }
        writeStyle(card, 'transform', `rotateY(${(at * step).toFixed(3)}deg) translateZ(${radius}px)`);
        writeStyle(card, 'visibility', 'visible');
      });
    }

    /** The scroll track is the pinned block plus one stretch of scroll per look. */
    function measure() {
      const pinHeight = pin.offsetHeight;
      const top = Math.min(HEADER, viewport - pinHeight);
      pin.style.top = `${top}px`;
      span = Math.max(1, (count - 1) * perLook);
      track.style.height = `${Math.round(pinHeight + (count - 1) * perLook)}px`;
      // Whole pixels, so each look's scroll position lands exactly on its angle.
      pinStart = Math.round(track.getBoundingClientRect().top + window.scrollY - top);
    }

    function setFront(slot: number) {
      const card = members[slot];
      if (slot === front && card === frontCard) return;
      // Track the card itself: after a filter swap the slot numbers change, and
      // the previous front card must still lose its highlight.
      if (frontCard >= 0) cards[frontCard].classList.remove('front');
      front = slot;
      frontCard = card;
      cards[card].classList.add('front');
      // The front look is shown at full resolution: a larger `sizes` makes the
      // browser choose the full-size source from the srcset. It is kept once
      // upgraded, so turning back never swaps a sharp image for a softer one.
      if (!upgraded.has(card)) { upgraded.add(card); images[card].sizes = '460px'; }
      void prepareImageGroup(cards[card], 'high');
      // Neighbours around the ring (it is circular even though scrolling is not),
      // so the looks either side of the front are decoded before they turn in.
      [1, -1].forEach(offset => { if (count > 1) void prepareImageGroup(cards[members[(slot + offset + count) % count]], 'auto'); });
      // Commit the panel in the same frame as the highlight, so the details and
      // the front look can never disagree, even for one frame. This runs only
      // when the front look changes, never per animation frame.
      flushSync(() => setView({ filter: shown, id: outfits[card].id }));
    }

    function select(next: OutfitFilter) {
      if (fade && !fade.swapped) { fade.next = next; return; }
      if (!fade && next === shown) return;
      // Fading back in already: reverse from the current opacity, not from full.
      const done = fade ? clamp((now() - fade.start) / FADE) : 1;
      fade = { start: now() - (1 - done) * FADE * (reduced.matches ? 0 : 1), next, swapped: false };
      controller.invalidate();
    }

    /** Arrows, keys and taps move the page, so scroll stays the single source of truth. */
    function go(slot: number) {
      if (count < 2) return;
      slot = Math.round(clamp(slot, 0, count - 1));
      requested = { slot, at: now() };
      scrollTo(scrollFor(slot), true);
    }

    api.current = {
      select,
      step: delta => {
        const base = requested && now() - requested.at < 900 ? requested.slot : Math.max(0, front);
        go(base + delta);
      },
    };

    // Dragging turns the ring by scrolling the page underneath it; vertical
    // touch movement stays native scrolling (touch-action: pan-y).
    const onDown = (event: PointerEvent) => {
      if (event.button !== 0 || (event.target instanceof Element && event.target.closest('button'))) return;
      drag = { id: event.pointerId, x: event.clientX, from: Math.max(window.scrollY, pinStart), moved: 0 };
      suppressClick = false;
      stage.classList.add('drag');
      stage.setPointerCapture(event.pointerId);
    };
    const onMove = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.id) return;
      const dx = event.clientX - drag.x;
      drag.moved = Math.max(drag.moved, Math.abs(dx));
      if (drag.moved < 4) return;
      scrollTo(clamp(drag.from - dx * DRAG_GAIN * perLook / step, pinStart, pinStart + span), false);
    };
    const onUp = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.id) return;
      suppressClick = drag.moved > 6;
      const moved = drag.moved;
      drag = null;
      stage.classList.remove('drag');
      // Settle on the nearest look.
      if (moved > 6 && count > 1) go(Math.round(progressAt(window.scrollY) * (count - 1)));
    };
    const onClick = (event: MouseEvent) => {
      if (suppressClick) { suppressClick = false; return; }
      const card = event.target instanceof Element ? event.target.closest<HTMLElement>('.cr-look') : null;
      const slot = card ? members.indexOf(cards.indexOf(card)) : -1;
      if (slot >= 0 && slot !== front) go(slot);
    };

    stage.addEventListener('pointerdown', onDown);
    stage.addEventListener('pointermove', onMove);
    stage.addEventListener('pointerup', onUp);
    stage.addEventListener('pointercancel', onUp);
    stage.addEventListener('click', onClick);

    return {
      id: 'collection', element: section, scrollDriven: true,
      ready: prepareImageGroup(cards[members[0]], 'high'),
      layout(frame) {
        viewport = frame.height;
        perLook = Math.round(frame.height * PER_LOOK);
        const stacked = frame.width <= STACKED;
        // Desktop keeps the reference size and placement. The compact stacked
        // view centres the ring between the stage top and its navigation row and
        // sizes the looks to that height, so the front look stays fully visible.
        const stageHeight = stage.clientHeight;
        const fit = stacked ? (stageHeight - 62) / 1.5 : Infinity;
        ring.style.top = stacked ? `${Math.round((6 + stageHeight - 56) / 2)}px` : '';
        width = Math.round(Math.max(56, Math.min(frame.width < 900 ? Math.min(150, frame.width * 0.36) : Math.min(210, frame.height * 0.26), fit)));
        stage.style.setProperty('--cw', `${width}px`);
        images.forEach((image, i) => { if (!upgraded.has(i)) image.sizes = `${width}px`; });
        arrange();
        measure();
        // Seat the ring now, so the looks never render around an untranslated
        // ring while the scene waits for its first image.
        writeStyle(ring, 'transform', `translateZ(${-radius}px) rotateX(-5deg) rotateY(${angleAt(progress).toFixed(3)}deg)`);
      },
      enter() { synced = false; },
      update(_, frame) {
        let opacity = 1;
        if (fade) {
          const e = reduced.matches ? 1 : clamp((frame.now - fade.start) / FADE);
          if (!fade.swapped) {
            opacity = 1 - ease(e);
            if (e >= 1) {
              // Swap the set while it is invisible: new ring, new scroll track,
              // and back to the start of the pinned stretch (the pinned block
              // sits in the same place there, so the jump is not visible).
              shown = fade.next;
              members = indicesFor(shown);
              arrange();
              measure();
              if (window.scrollY > pinStart) scrollTo(pinStart, false);
              progress = 0; synced = true; front = -1; requested = null;
              setFront(0);
              fade = { start: frame.now, next: shown, swapped: true };
              opacity = 0;
            }
          } else {
            opacity = ease(e);
            if (e >= 1) fade = null;
          }
        }
        // Scroll → rotation, eased with the site's scroll smoothing so the ring
        // turns at an even pace; reversing the scroll reverses the turn.
        const goal = progressAt(window.scrollY);
        if (!synced || reduced.matches) { progress = goal; synced = true; }
        else {
          const gap = goal - progress;
          progress += gap * scrollSmoothing(frame.deltaTime, gap * (count - 1) / 10);
          // Land exactly once within 0.2° (invisible), instead of crawling the
          // last fraction of a degree.
          if (Math.abs(goal - progress) * Math.max(1, count - 1) * step < 0.2) progress = goal;
        }
        const angle = angleAt(progress);
        writeStyle(ring, 'transform', `translateZ(${-radius}px) rotateX(-5deg) rotateY(${angle.toFixed(3)}deg)`);
        let best = 0, bestZ = -2;
        members.forEach((card, i) => {
          const z = Math.cos((i * step + angle) * Math.PI / 180);
          // Depth: looks turning away sink into shadow (opacity on an overlay,
          // so no per-frame filter repaint).
          writeStyle(shades[card], 'opacity', (0.5 * (1 - (z + 1) / 2)).toFixed(3));
          writeStyle(cards[card], 'opacity', opacity.toFixed(3));
          if (z > bestZ) { bestZ = z; best = i; }
        });
        if (count) setFront(best);
        return Boolean(fade || progress !== goal);
      },
      dispose() {
        api.current = null;
        stage.removeEventListener('pointerdown', onDown);
        stage.removeEventListener('pointermove', onMove);
        stage.removeEventListener('pointerup', onUp);
        stage.removeEventListener('pointercancel', onUp);
        stage.removeEventListener('click', onClick);
      },
    };
  });

  function choose(next: OutfitFilter) {
    if (next === filter) return;
    setFilter(next);
    api.current?.select(next);
    const url = new URL(window.location.href);
    if (next === 'all') url.searchParams.delete('occasion'); else url.searchParams.set('occasion', next);
    history.replaceState(history.state, '', url.pathname + url.search + url.hash);
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    api.current?.step(event.key === 'ArrowLeft' ? -1 : 1);
  }

  const members = outfitsFor(view.filter);
  return <section className="cr" id="looks" ref={ref} aria-labelledby="cr-title">
    <div className="cr-band">
      <span className="cr-orn" aria-hidden="true">
        <svg viewBox="0 0 34 20"><g fill="none" stroke="currentColor" strokeWidth="1.1"><path d="M17 1.5C14 5 14 10 17 15C20 10 20 5 17 1.5Z" /><path d="M17 15C12.5 14 9.5 10.5 9 6.5C13 7.5 16 10.5 17 15Z" /><path d="M17 15C21.5 14 24.5 10.5 25 6.5C21 7.5 18 10.5 17 15Z" /><path d="M17 15C11 16 5 14.5 1.5 11M17 15C23 16 29 14.5 32.5 11" /><path d="M8 18.5H26" /></g></svg>
      </span>
      <h1 id="cr-title">The collection</h1>
      <p className="lede">Turn the collection. The look in front tells you what it’s for and how we style it, head to toe.</p>
    </div>
    <div className="cr-track">
      <div className="cr-pin">
        <div className="cr-filters" role="group" aria-label="Filter by occasion">
          {outfitFilters.map(item => <button type="button" key={item.id} aria-pressed={item.id === filter} onClick={event => { event.currentTarget.scrollIntoView({ block: 'nearest', inline: 'nearest' }); choose(item.id); }}>{item.label}</button>)}
        </div>
        <div className="cr-grid">
          <div className="cr-stage" tabIndex={0} onKeyDown={onKeyDown} aria-roledescription="carousel" aria-label="Collection ring. Scroll, drag, or use the arrow keys, to turn.">
            <div className="cr-ring">
              {outfits.map(item => {
                const member = members.includes(item);
                return <div className="cr-look" key={item.id} data-id={item.id} aria-hidden={item.id !== look.id} inert={!member || undefined}>
                  <SourceImage asset={item.thumbnail} responsive sizes="(max-width: 899px) 150px, 210px" alt={item.id === look.id ? item.title : ''} draggable={false} />
                  <i className="cr-shade" />
                </div>;
              })}
            </div>
            <div className="cr-nav">
              <button type="button" aria-label="Previous look" onClick={() => api.current?.step(-1)}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M10 3 5 8l5 5" fill="none" stroke="currentColor" strokeWidth="1.4" /></svg></button>
              <span>Drag to rotate</span>
              <button type="button" aria-label="Next look" onClick={() => api.current?.step(1)}><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m6 3 5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.4" /></svg></button>
            </div>
          </div>
          {/* Every look's details share one grid cell and only the front one is
              shown, so the panel is always as tall as its longest look: the panel,
              its title and its button never move when the look changes, whatever
              the length of the title, description or detail list. */}
          <div className="cr-panel" aria-live="polite">
            {outfits.map(item => {
              const current = item.id === look.id;
              const position = list.indexOf(item);
              return <div className={`cr-panel-in${current ? ' is-current' : ''}`} key={item.id} data-outfit={item.id} aria-hidden={!current} inert={!current || undefined}>
                <div className="cr-occ">{occasionText(item)}</div>
                <h2>{item.title}</h2>
                <p className="cr-desc">{item.description}</p>
                <ul>{item.details.map(row => <li key={row.label} data-kind={row.kind}><b>{row.label}</b><span>{row.value}</span></li>)}</ul>
                <div className="cr-acts"><Button href="/contact">Book this look</Button></div>
                <div className="cr-count">{position >= 0 ? `Look ${position + 1} of ${list.length}` : ' '}</div>
              </div>;
            })}
          </div>
        </div>
      </div>
    </div>
  </section>;
}
