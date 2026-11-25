import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';
import { flushSync } from 'react-dom';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SectionHeading } from '../../components/common/SectionHeading';
import { SourceImage } from '../../components/common/SourceImage';
import { ceremonyTransformations } from '../../data/ceremonies';
import { images } from '../../data/images';
import type { ImageKey } from '../../data/images';
import { imageSource } from '../../data/imageSources';
import { onHeroReady } from '../../utils/heroReady';
import { onHeroReset } from '../../utils/heroState';
import { comparisonPanels } from '../../data/showcase';

gsap.registerPlugin(ScrollTrigger);

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));

/** Movement (px) before a touch or pen gesture on the image counts as a divider drag instead of a page scroll. */
const TOUCH_DRAG_SLOP = 6;
/** How long (s) the divider takes to catch up with the scroll position. */
const FOLLOW_SECONDS = 0.45;
const BEFORE_LABEL_HIDE_AT = 0.6;
const COCKTAIL_INDEX = ceremonyTransformations.findIndex(item => item.id === 'cocktail');
const homeComparisons = ceremonyTransformations.map((item, index) => index === COCKTAIL_INDEX ? {
  ...item,
  beforeImage: 'cocktail-home-before' as const,
  afterImage: 'cocktail-home-after' as const,
} : item);

/**
 * What the comparison frame shows for a photograph: its `-view` rendition when the registry has one (a lossless 1120x1400 copy of
 * a 6144x7680 master, which is what a frame at most 440 CSS px wide can use), otherwise the photograph itself.
 */
const viewKey = (asset: ImageKey): ImageKey => {
  const key = `${asset}-view`;
  return Object.hasOwn(images, key) ? key as ImageKey : asset;
};

function decodePair(index: number) {
  const item = homeComparisons[index];
  return Promise.all([imageSource(viewKey(item.beforeImage)).src, imageSource(viewKey(item.afterImage)).src].map(source => {
    const image = new Image();
    image.decoding = 'async';
    image.src = source;
    return image.decode().then(() => true, () => false);
  })).then(results => results.every(Boolean));
}

/**
 * The scroll offset (px) at which the pinned range says `value`. It is kept one pixel inside the range: landing on the
 * range's very edge can fall just outside it after the browser rounds the offset, and the stage would then leave its
 * pinned position (a visible jump) instead of staying where it is.
 */
function offsetFor(trigger: ScrollTrigger, value: number) {
  const target = trigger.start + value * (trigger.end - trigger.start);
  return Math.min(Math.floor(trigger.end) - 1, Math.max(Math.ceil(trigger.start) + 1, target));
}

/**
 * Scroll positions within this fraction (or within 2px, which covers the one-pixel inset of offsetFor on a short range) of
 * either end of the range read as exactly BEFORE / AFTER.
 */
const END_SNAP = 0.0015;
const snapEnds = (value: number, span: number) => {
  const edge = Math.max(END_SNAP, 2 / Math.max(1, span));
  return value < edge ? 0 : value > 1 - edge ? 1 : value;
};

interface Drag {
  pointerId: number;
  startX: number;
  startY: number;
  left: number;
  width: number;
  active: boolean;
}

/**
 * Cinematic before/after comparison.
 *
 * One value rules the whole component: `progress` (0 = all BEFORE, 1 = all AFTER). `render()` is the only writer of
 * the visuals (image clip and divider share the `--p` variable, plus the tags and aria values), and there are only
 * three inputs to it:
 *
 *  - scroll: a single pinned ScrollTrigger (no scrub tween to lose) feeds `progress` through a short follow tween;
 *  - dragging / keys: the pointer sets `progress` directly and takes priority while it is down;
 *  - choosing a ceremony: progress, scroll position and image pair are reset together in one synchronous step.
 *
 * Scroll position and progress stay two views of the same number. Whenever a manual input (or a reset) changes
 * `progress`, `alignScroll()` moves the scroll offset to the matching point of the pinned range, so scrolling carries
 * on from there in both directions. While the stage is pinned that move is invisible; when it is not pinned the
 * value waits (`handoffRef`) and is applied the moment the pin engages, so the page never jumps under the visitor.
 */
export function TransformationSection() {
  const [active, setActive] = useState(0);
  const [shown, setShown] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const beforeTagRef = useRef<HTMLSpanElement>(null);
  const afterTagRef = useRef<HTMLSpanElement>(null);
  const pairRef = useRef<HTMLDivElement>(null);

  const progress = useRef({ value: 0 });
  const triggerRef = useRef<ScrollTrigger | null>(null);
  const handoffRef = useRef<number | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const draggingRef = useRef(false);
  const switchingRef = useRef(false);
  const queuedRef = useRef<number | null>(null);
  const frameQueueRef = useRef<number | null>(null);
  const activeRef = useRef(0);
  const requestRef = useRef(0);
  const loadedRef = useRef(new Set<number>([0]));
  const cocktailDecodeRef = useRef<Promise<boolean> | null>(null);
  /** Re-orders the idle preloading of the other ceremonies around the one just chosen (set by the effect below). */
  const prioritiseRef = useRef<(center: number) => void>(() => {});
  const mountedRef = useRef(false);

  /** The single writer of every visual that depends on `progress`. */
  const render = (value: number) => {
    const next = clamp01(value);
    progress.current.value = next;
    const percent = next * 100;
    frameRef.current?.style.setProperty('--p', `${percent}%`);
    const handle = handleRef.current;
    if (handle) {
      handle.setAttribute('aria-valuenow', String(Math.round(percent)));
      handle.setAttribute('aria-valuetext', `${Math.round(100 - percent)}% before, ${Math.round(percent)}% with Mister Mapillai`);
    }
    const afterTag = afterTagRef.current;
    if (afterTag) {
      const frameWidth = frameRef.current?.clientWidth ?? 0;
      const revealThreshold = frameWidth
        ? (afterTag.offsetLeft + afterTag.offsetWidth + 12) / frameWidth * 100
        : 14;
      afterTag.style.opacity = percent < revealThreshold ? '0' : '1';
    }
    if (beforeTagRef.current) beforeTagRef.current.style.opacity = next < BEFORE_LABEL_HIDE_AT ? '1' : '0';
  };

  /** Ease towards a value (scroll input). */
  const follow = (target: number) => {
    gsap.to(progress.current, {
      value: clamp01(target),
      duration: FOLLOW_SECONDS,
      ease: 'power3.out',
      overwrite: true,
      onUpdate: () => render(progress.current.value),
    });
  };

  /** Set a value at once, stopping any easing in flight (manual input, reset). */
  const jump = (value: number) => {
    gsap.killTweensOf(progress.current);
    cancelQueued();
    render(value);
  };

  /** Pointer moves arrive faster than frames: remember the latest value and paint it once per frame. */
  const queueRender = (value: number) => {
    const next = clamp01(value);
    progress.current.value = next;
    queuedRef.current = next;
    if (frameQueueRef.current !== null) return;
    frameQueueRef.current = requestAnimationFrame(() => {
      frameQueueRef.current = null;
      const queued = queuedRef.current;
      queuedRef.current = null;
      if (queued !== null) render(queued);
    });
  };

  const cancelQueued = () => {
    if (frameQueueRef.current !== null) cancelAnimationFrame(frameQueueRef.current);
    frameQueueRef.current = null;
    queuedRef.current = null;
  };

  /**
   * Make the scroll offset say the same thing as `value`, so the scroll animation continues from it.
   * Inside the pinned range this only moves the offset (the pinned stage does not move on screen).
   * Before the range the value is held and applied when the pin engages (the stage is still below the fold of its pin, so
   * scrolling down reaches it). Past the range the stage is sliding up under the navbar, and scrolling further down could
   * never reveal anything: if any of it is still on screen (the filter row and the slider can still be used) it is put back
   * in its pinned position at `value`, which on screen is a few pixels, so the visitor stays in the section and can scroll
   * on from there. Only a stage that has left the screen holds the value.
   */
  const alignScroll = (value: number) => {
    const trigger = triggerRef.current;
    if (!trigger) return;
    const y = window.scrollY;
    if (y < trigger.start) { handoffRef.current = value > 0.001 ? value : null; return; }
    if (y > trigger.end) {
      const stage = stageRef.current;
      const navBottom = document.querySelector('.mm-nav')?.getBoundingClientRect().bottom ?? 0;
      if (stage && stage.getBoundingClientRect().bottom > navBottom) {
        handoffRef.current = null;
        window.scrollTo({ top: offsetFor(trigger, value), behavior: 'instant' as ScrollBehavior });
        return;
      }
      handoffRef.current = value < 0.999 ? value : null;
      return;
    }
    handoffRef.current = null;
    const target = offsetFor(trigger, value);
    if (Math.abs(target - y) > 0.5) window.scrollTo({ top: target, behavior: 'instant' as ScrollBehavior });
  };

  useEffect(() => {
    render(0);
    // The photograph is sized from what is left of the screen below the filter row (template.css reads --ba-top), so the pinned
    // stage always shows all of it. The filter row wraps to a different number of lines at different widths and when the web
    // fonts arrive, hence the observer; a changed value re-measures the pin once, not on every resize event.
    let topTimer = 0;
    const measureTop = () => {
      const stage = stageRef.current;
      const wrap = stage?.querySelector<HTMLElement>('.mm-ba-wrap');
      if (!stage || !wrap) return;
      const top = `${wrap.offsetTop}px`;
      if (stage.style.getPropertyValue('--ba-top') === top) return;
      stage.style.setProperty('--ba-top', top);
      window.clearTimeout(topTimer);
      topTimer = window.setTimeout(() => ScrollTrigger.refresh(), 120);
    };
    measureTop();
    const tabsObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(measureTop) : null;
    const tabsElement = stageRef.current?.querySelector('.mm-ba-tabs');
    if (tabsElement) tabsObserver?.observe(tabsElement);
    // Warm the smaller pairs as the section approaches the viewport. Cocktail includes the original 40 MP After photo, so
    // wait for an explicit selection before spending its transfer and decode budget.
    const saveData = Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData);
    let queue: number[] = [];
    let idle = 0;
    let observer: IntersectionObserver | null = null;
    let stopped = false;
    const schedule = () => {
      if (stopped || idle || !queue.length) return;
      const run = () => {
        idle = 0;
        const next = queue.shift();
        if (stopped || next === undefined) return;
        void decodePair(next).then(() => { loadedRef.current.add(next); schedule(); });
      };
      idle = typeof window.requestIdleCallback === 'function' ? window.requestIdleCallback(run, { timeout: 2500 }) : window.setTimeout(run, 250);
    };
    const prioritise = (center: number) => {
      if (saveData || !observer && !loadedRef.current.size) return;
      queue = homeComparisons.map((_, index) => index)
        .filter(index => index !== center && index !== COCKTAIL_INDEX && !loadedRef.current.has(index))
        .sort((a, b) => Math.abs(a - center) - Math.abs(b - center) || a - b);
      schedule();
    };
    prioritiseRef.current = prioritise;
    const stopWaiting = onHeroReady(() => {
      observer = new IntersectionObserver(entries => {
        if (!entries.some(entry => entry.isIntersecting)) return;
        observer?.disconnect();
        const here = activeRef.current;
        if (here === COCKTAIL_INDEX) { prioritise(here); return; }
        void decodePair(here).then(() => { loadedRef.current.add(here); prioritise(here); });
      }, { rootMargin: '200% 0px' });
      if (stageRef.current) observer.observe(stageRef.current);
    });

    const media = gsap.matchMedia();
    /** One ScrollTrigger for the section's whole life: choosing a ceremony resets `progress`, never the trigger. */
    const build = (start: string, end: string) => {
      const trigger = ScrollTrigger.create({
        trigger: stageRef.current,
        start,
        end,
        pin: true,
        pinSpacing: true,
        invalidateOnRefresh: true,
        onUpdate: self => {
          // Manual input wins; a waiting handoff means the divider holds a value the scroll offset does not say yet.
          if (switchingRef.current || draggingRef.current || handoffRef.current !== null) return;
          follow(snapEnds(self.progress, self.end - self.start));
        },
        onToggle: self => {
          const waiting = handoffRef.current;
          if (!self.isActive || waiting === null) return;
          handoffRef.current = null;
          window.scrollTo({ top: offsetFor(self, waiting), behavior: 'instant' as ScrollBehavior });
        },
        // Scrolled clean through the range without ever being pinned: the scroll position has the final word.
        onLeave: self => { if (handoffRef.current !== null) { handoffRef.current = null; follow(snapEnds(self.progress, self.end - self.start)); } },
        onLeaveBack: self => { if (handoffRef.current !== null) { handoffRef.current = null; follow(snapEnds(self.progress, self.end - self.start)); } },
      });
      triggerRef.current = trigger;
      return () => { triggerRef.current = null; };
    };
    media.add('(prefers-reduced-motion: no-preference) and (min-width: 641px)', () => build('top 90px', '+=140%'));
    media.add('(prefers-reduced-motion: no-preference) and (max-width: 640px)', () => build('top 72px', '+=80%'));

    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener('load', refresh);
    const refreshTimer = window.setTimeout(refresh, 300);
    // An explicit return to the top of the home page must glide cleanly past this pin without a pending filter handoff hijacking the scroll.
    const stopHeroReset = onHeroReset(() => { handoffRef.current = null; });

    return () => {
      stopHeroReset();
      window.removeEventListener('load', refresh);
      window.clearTimeout(refreshTimer);
      stopWaiting();
      stopped = true;
      tabsObserver?.disconnect();
      window.clearTimeout(topTimer);
      observer?.disconnect();
      if (idle) { if (typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(idle); else window.clearTimeout(idle); }
      prioritiseRef.current = () => {};
      media.revert();
      gsap.killTweensOf(progress.current);
      cancelQueued();
    };
    // render, follow and cancelQueued only touch refs, so the first render's copies stay correct: one setup is right.
  }, []);

  /** A swapped-in pair whose images are somehow not ready stays hidden (never a wrong or half-drawn image). */
  useLayoutEffect(() => {
    if (!mountedRef.current) { mountedRef.current = true; return; }
    const pair = pairRef.current;
    if (!pair) return;
    const waiting = Array.from(pair.querySelectorAll('img')).filter(image => !image.complete);
    if (!waiting.length) return;
    pair.style.visibility = 'hidden';
    let left = waiting.length;
    const reveal = () => { left -= 1; if (left <= 0) pair.style.visibility = ''; };
    waiting.forEach(image => {
      image.addEventListener('load', reveal, { once: true });
      image.addEventListener('error', reveal, { once: true });
    });
    const timer = window.setTimeout(() => { pair.style.visibility = ''; }, 2500);
    return () => {
      window.clearTimeout(timer);
      pair.style.visibility = '';
      waiting.forEach(image => { image.removeEventListener('load', reveal); image.removeEventListener('error', reveal); });
    };
  }, [shown]);

  /**
   * Choose a ceremony. Its pair is decoded first; then pair, progress and scroll position change in one synchronous
   * step, so the previous ceremony's image or divider is never on screen next to the new state.
   */
  const select = (index: number) => {
    if (index === activeRef.current) return;
    activeRef.current = index;
    setActive(index);
    const token = ++requestRef.current;
    switchingRef.current = true;
    dragRef.current = null;
    draggingRef.current = false;

    const commit = () => {
      if (requestRef.current !== token) return; // a newer choice took over
      flushSync(() => setShown(index));
      jump(0);
      alignScroll(0);
      switchingRef.current = false;
      prioritiseRef.current(index); // the neighbours of the new ceremony are the likely next choices
    };
    if (loadedRef.current.has(index)) commit();
    else if (index === COCKTAIL_INDEX) {
      cocktailDecodeRef.current ??= decodePair(index).finally(() => { cocktailDecodeRef.current = null; });
      void cocktailDecodeRef.current.then(ready => {
        if (ready) {
          loadedRef.current.add(index);
          commit();
        } else if (requestRef.current === token) {
          // Keep the displayed pair usable and allow a retry instead of swapping in a failed photo.
          activeRef.current = shown;
          setActive(shown);
          switchingRef.current = false;
        }
      });
    }
    else void decodePair(index).then(() => { loadedRef.current.add(index); commit(); });
  };

  const valueAt = (drag: Drag, clientX: number) => clamp01((clientX - drag.left) / drag.width);

  const beginDrag = (event: ReactPointerEvent<HTMLDivElement>, drag: Drag) => {
    drag.active = true;
    draggingRef.current = true;
    gsap.killTweensOf(progress.current);
    handoffRef.current = null;
    event.currentTarget.setPointerCapture(event.pointerId);
    queueRender(valueAt(drag, event.clientX));
  };

  /** The divider is where the visitor let go: that exact value becomes the scroll position too. */
  const endDrag = (value: number) => {
    dragRef.current = null;
    draggingRef.current = false;
    jump(value);
    alignScroll(value);
  };

  const onDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (switchingRef.current) return;
    if (event.pointerType === 'mouse' ? event.button !== 0 : dragRef.current) return; // a second finger is ignored
    const rect = event.currentTarget.getBoundingClientRect();
    const drag: Drag = { pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, left: rect.left, width: rect.width, active: false };
    dragRef.current = drag;
    // A mouse press is unambiguous. A finger may be starting a page scroll, so it has to move sideways first.
    if (event.pointerType === 'mouse') beginDrag(event, drag);
  };

  const onMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (event.pointerType === 'mouse' && event.buttons === 0) { onUp(event); return; }
    if (!drag.active) {
      const dx = Math.abs(event.clientX - drag.startX);
      const dy = Math.abs(event.clientY - drag.startY);
      if (dx < TOUCH_DRAG_SLOP || dx < dy) return;
      beginDrag(event, drag);
      return;
    }
    queueRender(valueAt(drag, event.clientX));
  };

  const onUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    endDrag(valueAt(drag, event.clientX)); // also a tap with a finger: the divider goes to the tapped point
  };

  /**
   * The browser took the gesture (a vertical page scroll) or the frame's own capture was lost: keep what is on screen.
   * (A touch also hands the pointer's implicit capture back from the image under the finger; that event bubbles up
   * here too, and is not the end of the drag.)
   */
  const onCancel = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    if (drag.active) endDrag(progress.current.value);
    else dragRef.current = null;
  };

  const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (switchingRef.current) return;
    const step = event.shiftKey ? 0.2 : 0.05;
    const current = progress.current.value;
    const next = { ArrowLeft: current - step, ArrowRight: current + step, Home: 0, End: 1 }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    handoffRef.current = null;
    jump(next);
    alignScroll(clamp01(next));
  };

  const look = homeComparisons[shown];

  return <section className="mm-sec mm-sec--white mm-ba-sec" aria-labelledby="ba-title">
    <div className="mm-container">
      <SectionHeading
        id="ba-title"
        eyebrow="The Difference"
        title={<>With &amp; Without <em>Mister Mapillai</em></>}
      />
      <div className="mm-ba-stage" ref={stageRef}>
        <div className="mm-ba-tabs" role="group" aria-label="Choose a ceremony">
          {ceremonyTransformations.map((ceremony, index) => <button type="button" className="mm-tab" key={ceremony.id} aria-pressed={index === active} onClick={() => select(index)}>{ceremony.title}</button>)}
        </div>
        <div className="mm-ba-wrap" role="group" aria-label="With and Without Mister Mapillai comparison">
          <div className="mm-ba-panel mm-ba-panel--before mm-reveal mm-reveal--left">
            <h4>{comparisonPanels.usual.title}</h4>
            <ul className="mm-ba-bullets">
              {comparisonPanels.usual.points.map(point => <li key={point}>{point}</li>)}
            </ul>
          </div>
          <div
            className="mm-ba mm-reveal mm-reveal--zoom"
            ref={frameRef}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onCancel}
            onLostPointerCapture={event => { if (event.target === event.currentTarget) onCancel(event); }}
          >
            <div className="mm-ba__pair" data-ceremony={look.id} key={look.id} ref={pairRef}>
              <div className="mm-ba__layer mm-ba__layer--after">
                <SourceImage asset={viewKey(look.afterImage)} alt={`${look.title} with Mister Mapillai`} draggable={false} loading="lazy" nativeLazy />
              </div>
              <div className="mm-ba__layer mm-ba__layer--before">
                <SourceImage asset={viewKey(look.beforeImage)} alt={`${look.title} before`} draggable={false} loading="lazy" nativeLazy />
              </div>
            </div>
            <span className="mm-ba__tag mm-ba__tag--after" ref={afterTagRef} aria-hidden="true">WITH MISTER<br />{' '}MAPILLAI</span>
            <span className="mm-ba__tag mm-ba__tag--before" ref={beforeTagRef} aria-hidden="true">Before</span>
            <div
              className="mm-ba__handle"
              ref={handleRef}
              role="slider"
              tabIndex={0}
              aria-label="Before and after divider"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={0}
              aria-valuetext="100% before, 0% with Mister Mapillai"
              onKeyDown={onKey}
            />
          </div>
          <div className="mm-ba-panel mm-ba-panel--after mm-reveal mm-reveal--right">
            <h4>{comparisonPanels.mapillai.title}</h4>
            <ul className="mm-ba-bullets">
              {comparisonPanels.mapillai.points.map(point => <li key={point}>{point}</li>)}
            </ul>
          </div>
        </div>
      </div>
    </div>
  </section>;
}
