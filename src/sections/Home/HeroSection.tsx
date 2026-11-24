import { Fragment, useRef } from 'react';
import { useSceneAnimation } from '../../components/animations/AnimationProvider';
import { fittingHref } from '../../data/navigation';
import { clamp, writeStyle } from '../../utils/animation';
import { cssVars } from '../../utils/style';
import { markHeroReady } from '../../utils/heroReady';
import { heroCompleted, rememberHeroCompleted } from '../../utils/heroState';
import { SOURCE_SIZE, createHeroRenderer, deviceProfile, frameScale, frameUrls } from './heroFrames';
import { CROSSFADE, HERO_STAGES, buildStageMap } from './heroStages';

const lines: readonly (readonly [word: string, gold?: boolean][])[] = [
  [['Crafted'], ['for'], ['the'], ['Groom.', true]],
  [['Styled'], ['Head'], ['to'], ['Toe.']],
];

/** The eight stages (heroStages.ts): which frames each one plays and for how long. */
const STAGES = buildStageMap(HERO_STAGES, frameUrls.length);
/** The introduction lifts away and the frames fade in over this long (ms) as the first stage starts, and the reverse after the first stage is played back. */
const INTRO_MS = 1000;
/** The first stage starts moving once its frame 1 has mostly faded in (ms after the scroll). */
const FIRST_STAGE_DELAY_MS = 800;
/**
 * Wheel and trackpad: events closer together than this (ms) are one gesture, which starts at most one stage. Trackpad momentum
 * and a wheel spun on through a stage are part of the gesture that started it, so they never start the next one.
 */
const GESTURE_GAP_MS = 220;
/** Touch: how far (px) a finger must travel in one swipe to start a stage. */
const SWIPE_PX = 28;
/** The hero takes scroll input only while it is fully in view, at the top of the page (px of tolerance). */
const TOP_PX = 2;
/** A stage held up this long (ms) beyond the renderer's stall report, waiting for frames that do not arrive, stops blocking the scroll. */
const RELEASE_AFTER_STALL_MS = 4000;
/** After a reload of a completed hero, its final frame fades in over this long (ms) once it is drawn. */
const RESTORE_FADE_MS = 400;

const smoothstep = (value: number, from: number, to: number) => {
  const t = clamp((value - from) / (to - from));
  return t * t * (3 - 2 * t);
};

/** Keys that scroll the page, and which way. */
const KEYS: Record<string, 1 | -1> = { ArrowDown: 1, PageDown: 1, ' ': 1, ArrowUp: -1, PageUp: -1 };

/**
 * Staged cinematic hero. The page stays at the top while the eight stages play: one deliberate scroll starts the next stage, which
 * plays on the renderer's own clock to its last frame and holds there until the next scroll; scrolling up plays the current stage
 * back. After the last stage the next scroll goes to the page as usual. The hero is one scene on the site's shared animation
 * scheduler (no second loop); the frames are drawn by the renderer (a worker where supported), never through React state.
 *
 * Input that is not a scroll gesture (the scrollbar, an anchor link, Home/End) is not intercepted, and a stage that cannot get its
 * frames (offline) stops blocking the scroll after a while, so the visitor is never trapped. With reduced motion there are no stages:
 * the introduction is the hero, as before.
 *
 * Reload: a hero played to the end stays complete (utils/heroState.ts): it comes back on its final frame, the page is restored to
 * where the visitor was (scrollRestore.ts) and scrolls on freely. A hero reloaded part-way through starts again from frame 1.
 */
export function HeroSection() {
  const trackRef = useRef<HTMLElement>(null);

  useSceneAnimation(trackRef, (track, controller) => {
    const stage = track.querySelector<HTMLElement>('.mm-hero')!;
    const canvas = stage.querySelector<HTMLCanvasElement>('.mm-hero__canvas')!;
    const poster = stage.querySelector<HTMLImageElement>('.mm-hero__poster')!;
    const content = stage.querySelector<HTMLElement>('.mm-hero__content')!;
    const media = stage.querySelector<HTMLElement>('.mm-hero__media')!;
    const veil = stage.querySelector<HTMLElement>('.mm-hero__veil')!;
    const hint = stage.querySelector<HTMLElement>('.mm-scroll-hint')!;
    const profile = deviceProfile();
    const reducedAtStart = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const total = STAGES.stages.length;

    /** This history entry's hero was played to the end before a reload (or a back/forward step): it comes back complete. */
    const restored = !reducedAtStart && frameUrls.length > 1 && heroCompleted();
    /** Stages completed (0: the introduction on frame 1; total: the final frame, and the page scrolls on). */
    let done = 0;
    /** The stage being played: its direction and the count of completed stages once it ends. */
    let playing: { dir: 1 | -1; done: number } | null = null;
    /** 0: introduction shown, frames hidden; 1: frames shown. Eases between the two. */
    let intro = restored ? 1 : 0;
    /** A restored hero waits, text hidden, until its final frame is drawn (never flashing frame 1), then fades it in. */
    let restoring = restored, restoreReveal = restored ? 0 : 1;
    let textHidden = false;
    let failed = false, stalledOut = false, stallTimer = 0;

    // Reduced motion: no stages and no frame downloads; the maroon introduction is the hero.
    const renderer = !reducedAtStart && frameUrls.length > 1
      ? createHeroRenderer(canvas, poster, profile, {
        onReady: () => canvas.classList.add('is-ready'),
        // Frame 1 is decoded: the site loader may lift, and the frames after it may start to load.
        onCritical: () => { markHeroReady(); warm(); },
        onPlayed: () => finish(),
        onStall: stalled => stall(stalled),
        onFailed: () => { failed = true; },
      })
      : null;
    if (!renderer) markHeroReady();
    if (renderer && restored) {
      // Bring the final frame back (a stage of no length that ends on it): the hero is complete again once it is on the canvas.
      playing = { dir: 1, done: total };
      renderer.play(STAGES.rest(total), STAGES.rest(total), 1, 0, false);
    } else renderer?.seek(STAGES.rest(0));

    // The warm-up of the frames after frame 1 starts once frame 1 is drawn (the site loader lifts then) and the browser is idle:
    // frame 1 has the network to itself until it has arrived, and the frames after it load while the visitor reads the introduction.
    let idle = 0, warmed = false;
    const warm = () => {
      if (warmed || !renderer) return;
      warmed = true;
      idle = typeof window.requestIdleCallback === 'function' ? window.requestIdleCallback(() => renderer.allowWarm(), { timeout: 1500 }) : window.setTimeout(() => renderer.allowWarm(), 300);
    };

    /** Have the stages either side of the frame at rest ready to play. */
    const prepare = () => {
      const ranges: [number, number][] = [];
      if (done < total) ranges.push([STAGES.rest(done), STAGES.rest(done + 1)]);
      if (done > 0) ranges.push([STAGES.rest(done), STAGES.rest(done - 1)]);
      renderer?.prepare(ranges);
    };

    /** Start the next stage (dir 1) or play the current one back (dir -1). A playing stage is never interrupted. */
    const start = (dir: 1 | -1) => {
      if (!renderer || playing || (dir > 0 ? done >= total : done <= 0)) return;
      const k = dir > 0 ? done : done - 1;
      const { start: first, end: last, ms } = STAGES.stages[k];
      playing = { dir, done: done + dir };
      // Playing back from the end: the hero is no longer complete, so a reload from here starts it again.
      if (dir < 0) rememberHeroCompleted(false);
      renderer.play(dir > 0 ? first : last, dir > 0 ? last : first, ms, dir > 0 && k === 0 ? FIRST_STAGE_DELAY_MS : 0, CROSSFADE);
      controller.invalidate();
    };
    /** The stage's last frame is on the canvas: hold it until the next scroll. */
    const finish = () => {
      if (!playing) return;
      done = playing.done;
      playing = null;
      restoring = false;
      rememberHeroCompleted(done === total);
      stall(false);
      prepare();
      controller.invalidate();
    };
    /** Frames not arriving: after a while, stop holding the scroll (the stage keeps trying, and carries on when they come). */
    const stall = (stalled: boolean) => {
      window.clearTimeout(stallTimer);
      stallTimer = stalled ? window.setTimeout(() => { stalledOut = true; }, RELEASE_AFTER_STALL_MS) : 0;
      if (!stalled) stalledOut = false;
    };

    /**
     * Whether a scroll in this direction belongs to the hero rather than the page: the hero is fully in view at the top, and a
     * stage is playing (every scroll is held then) or there is a stage to play that way.
     */
    const owns = (dir: 1 | -1) => !!renderer && !failed && !stalledOut && window.scrollY <= TOP_PX
      && (playing !== null || (dir > 0 ? done < total : done > 0));

    // Wheel and trackpad.
    let wheelAt = -Infinity, wheelSize = 0, gestureSpent = false;
    const onWheel = (event: WheelEvent) => {
      if (event.ctrlKey) return; // pinch-zoom
      const unit = event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? window.innerHeight : 1;
      const dy = event.deltaY * unit, dx = event.deltaX * unit;
      if (!dy || Math.abs(dy) < Math.abs(dx)) return;
      const now = performance.now(), size = Math.abs(dy);
      // A new gesture: after a pause, or a fresh swipe that is clearly stronger than the momentum still running.
      if (now - wheelAt > GESTURE_GAP_MS || (size >= 24 && size > wheelSize * 2.5)) gestureSpent = false;
      wheelAt = now;
      wheelSize = size;
      const dir = dy > 0 ? 1 : -1;
      // Scrolling the page instead (e.g. coming back up from the sections below): its momentum must not start a stage on arrival.
      if (!owns(dir)) { gestureSpent = true; return; }
      event.preventDefault();
      if (playing || gestureSpent) return;
      gestureSpent = true;
      start(dir);
    };

    // Touch: one swipe, one stage. Whether a swipe belongs to the hero is decided on its first movement, so the page never
    // starts scrolling under a stage; a tap (no movement) is left alone, so the buttons work.
    let touch: { y: number; owned: boolean | null; used: boolean } | null = null;
    const onTouchStart = (event: TouchEvent) => {
      touch = event.touches.length === 1 ? { y: event.touches[0].clientY, owned: null, used: false } : null;
    };
    const onTouchMove = (event: TouchEvent) => {
      if (!touch || event.touches.length !== 1) return;
      const dy = touch.y - event.touches[0].clientY;
      if (touch.owned === null) {
        if (Math.abs(dy) < 2) return;
        touch.owned = owns(dy > 0 ? 1 : -1);
      }
      if (!touch.owned) return;
      if (event.cancelable) event.preventDefault();
      if (touch.used || Math.abs(dy) < SWIPE_PX) return;
      touch.used = true;
      if (!playing) start(dy > 0 ? 1 : -1);
    };
    const onTouchEnd = () => { touch = null; };

    // Keyboard: the keys that scroll the page step through the stages instead (not while typing, or on a focused button).
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      let dir = KEYS[event.key];
      if (!dir) return;
      if (event.key === ' ' && event.shiftKey) dir = -1;
      const target = event.target as HTMLElement | null;
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(target.tagName))) return;
      if (!owns(dir)) return;
      event.preventDefault();
      if (playing || event.repeat) return;
      start(dir);
    };

    if (renderer) {
      window.addEventListener('wheel', onWheel, { passive: false });
      window.addEventListener('touchstart', onTouchStart, { passive: true });
      window.addEventListener('touchmove', onTouchMove, { passive: false });
      window.addEventListener('touchend', onTouchEnd, { passive: true });
      window.addEventListener('touchcancel', onTouchEnd, { passive: true });
      window.addEventListener('keydown', onKeyDown);
    }

    return {
      id: 'hero-sequence',
      element: track,
      layout() {
        if (!renderer) return;
        const stageStyle = getComputedStyle(stage);
        // Phones and tablets (template.css) set --mm-hero-ambient: the space around the whole frame is then a soft wash
        // of its own edge colours instead of flat maroon. Desktop leaves it unset (0).
        const ambient = Math.min(1, Math.max(0, parseFloat(stageStyle.getPropertyValue('--mm-hero-ambient')) || 0));
        // Canvas backing store in device pixels, capped by DPR and an area budget.
        const width = stage.clientWidth, height = stage.offsetHeight;
        // Never more canvas pixels than the source has: the frames hold no more detail, so a larger backing store (a 2560 px
        // screen, or a high-DPR laptop) would only cost fill rate and memory; the compositor scales the canvas to the stage.
        const sourceScale = frameScale(width, height, poster.naturalWidth || SOURCE_SIZE.width, poster.naturalHeight || SOURCE_SIZE.height);
        const dpr = Math.min(window.devicePixelRatio || 1, profile.maxDpr, Math.sqrt(profile.maxArea / Math.max(1, width * height)), 1 / sourceScale);
        const canvasWidth = Math.round(width * dpr), canvasHeight = Math.round(height * dpr);
        const sourceWidth = poster.naturalWidth || SOURCE_SIZE.width, sourceHeight = poster.naturalHeight || SOURCE_SIZE.height;
        const scale = frameScale(width, height, sourceWidth, sourceHeight) * dpr;
        const w = Math.round(sourceWidth * scale), h = Math.round(sourceHeight * scale);
        // The whole frame, centred; the letterbox around it is painted maroon.
        const x = Math.round((canvasWidth - w) / 2);
        const y = Math.round((canvasHeight - h) / 2);
        // Frames are decoded at the drawn size, but never above the source resolution.
        const fit = Math.min(1, sourceWidth / w);
        renderer.layout({
          canvasWidth, canvasHeight,
          x, y, w, h,
          cover: w >= canvasWidth && h >= canvasHeight,
          ambient,
          decodeWidth: Math.round(w * fit), decodeHeight: Math.round(h * fit),
          sourceWidth, sourceHeight,
        });
      },
      update(_, frame) {
        // The introduction gives way to the frames as the first stage starts, and comes back once it has been played back.
        const target = renderer && !failed && (done > 0 || playing?.dir === 1) ? 1 : 0;
        if (frame.reducedMotion) intro = target;
        else intro = target > intro ? Math.min(target, intro + frame.deltaTime * 1000 / INTRO_MS) : Math.max(target, intro - frame.deltaTime * 1000 / INTRO_MS);

        if (!restoring && restoreReveal < 1) restoreReveal = frame.reducedMotion ? 1 : Math.min(1, restoreReveal + frame.deltaTime * 1000 / RESTORE_FADE_MS);
        // The introduction lifts away; hidden (not removed) only once fully transparent.
        const out = smoothstep(intro, 0, 0.75);
        writeStyle(content, 'opacity', (1 - out).toFixed(3));
        writeStyle(content, 'transform', out ? `translate3d(0,${(-50 * out).toFixed(1)}px,0) scale(${(1 - 0.04 * out).toFixed(4)})` : '');
        writeStyle(hint, 'opacity', (1 - clamp(out * 3)).toFixed(3));
        const hidden = out > 0.995;
        if (hidden !== textHidden) { textHidden = hidden; writeStyle(content, 'visibility', hidden ? 'hidden' : 'visible'); }
        // The frames fade in over the maroon; the veil eases to a light vignette.
        const reveal = smoothstep(intro, 0.2, 1) * smoothstep(restoreReveal, 0, 1);
        writeStyle(media, 'opacity', reveal.toFixed(3));
        writeStyle(veil, 'opacity', (1 - 0.7 * reveal).toFixed(3));
        return intro !== target || (!restoring && restoreReveal < 1);
      },
      // Back in view: decode the frames around the one at rest again.
      enter() {
        if (!playing) renderer?.seek(STAGES.rest(done));
      },
      // Scrolled past the hero: free the decoded frames (the next visit to the hero decodes them again in ~0.1 s).
      leave() {
        renderer?.rest();
      },
      dispose() {
        window.removeEventListener('wheel', onWheel);
        window.removeEventListener('touchstart', onTouchStart);
        window.removeEventListener('touchmove', onTouchMove);
        window.removeEventListener('touchend', onTouchEnd);
        window.removeEventListener('touchcancel', onTouchEnd);
        window.removeEventListener('keydown', onKeyDown);
        window.clearTimeout(stallTimer);
        if (idle) { if (typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(idle); else window.clearTimeout(idle); }
        renderer?.dispose();
      },
    };
  });

  let index = 0;
  return <section className="mm-hero-seq" ref={trackRef} aria-labelledby="hero-title">
    <div className="mm-hero">
      <div className="mm-hero__media" aria-hidden="true">
        {/* Frame 1: the canvas's first frame, and the frame shown if the sequence cannot load. Hidden until the first stage starts. */}
        <img className="mm-hero__poster" src={frameUrls[0]} alt="" width={1920} height={1088} fetchPriority="high" decoding="async" data-frame-sequence="" />
        <canvas className="mm-hero__canvas" />
      </div>
      <div className="mm-hero__veil" aria-hidden="true" />
      <div className="mm-hero__content">
        <p className="mm-hero__brand gold-text">Mister Mapillai</p>
        <span className="mm-eyebrow">Bespoke Groom Wear · Since 2014</span>
        <h1 id="hero-title">
          {lines.map((line, row) => <Fragment key={row}>
            {row > 0 ? <br /> : null}
            {line.map(([word, gold]) => {
              const i = index++;
              return <Fragment key={word}>
                <span className="mm-hero__w" style={cssVars({ '--i': i })}>{gold ? <em>{word}</em> : word}</span>{' '}
              </Fragment>;
            })}
          </Fragment>)}
        </h1>
        <p className="mm-hero__sub">From Muhurtham to Reception — one designer, every ritual, perfected.</p>
        <div className="mm-btns">
          <a href={fittingHref} className="mm-btn mm-btn--gold">Book Your Look</a>
          <a href="/track-order" className="mm-btn mm-btn--outline">Track Order</a>
        </div>
      </div>
      <div className="mm-scroll-hint" aria-hidden="true">SCROLL<i /></div>
    </div>
  </section>;
}
