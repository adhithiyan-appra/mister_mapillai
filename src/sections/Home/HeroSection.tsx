import { Fragment, useRef } from 'react';
import { useSceneAnimation } from '../../components/animations/AnimationProvider';
import { fittingHref } from '../../data/navigation';
import { clamp, writeStyle } from '../../utils/animation';
import { cssVars } from '../../utils/style';
import { markHeroReady } from '../../utils/heroReady';
import { heroCompleted, onHeroReset, rememberHeroCompleted } from '../../utils/heroState';
import { SOURCE_SIZE, createHeroRenderer, deviceProfile, frameScale, frameUrls } from './heroFrames';
import { HERO_STAGES, buildStageMap } from './heroStages';

const lines: readonly (readonly [word: string, gold?: boolean][])[] = [
  [['Crafted'], ['for'], ['the'], ['Groom.', true]],
  [['Styled'], ['Head'], ['to'], ['Toe.']],
];

/** The six stages (heroStages.ts): which frames each one plays and for how long. */
const STAGES = buildStageMap(HERO_STAGES, frameUrls.length);
/** The introduction lifts away over this long (ms) as the first stage starts, and comes back after the first stage is played back. */
const INTRO_MS = 1000;
/**
 * The first stage moves from the first scroll, with no pause; the frames fade in over the first 30% of INTRO_MS (300 ms) so its
 * opening frames are seen, while the introduction lifts away over them.
 */
const FRAMES_IN = 0.3;
/** Opacity of the frames while the introduction hides them (see paintLayers): imperceptible, but never 0. */
const HIDDEN_FRAMES = 0.01;
/**
 * Wheel and trackpad: events closer together than this (ms) are one gesture, which starts at most one stage. Trackpad momentum
 * and a wheel spun on through a stage are part of the gesture that started it, so they never start the next one.
 */
const GESTURE_GAP_MS = 220;
/** Touch: how far (px) a finger must travel in one swipe to start a stage. */
const SWIPE_PX = 28;
/** The hero takes scroll input only while it is fully in view, at the top of the page (px of tolerance). */
const TOP_PX = 2;
/** After a reload of a completed hero, its final frame fades in over this long (ms) once it is drawn. */
const RESTORE_FADE_MS = 400;
/**
 * A stage that has waited this long (ms) without a single frame downloading or decoding is on a dead connection: the page is let go
 * (it scrolls as usual) until frames arrive again, so no visitor is ever stuck at the top.
 */
const STALL_MS = 10_000;

const smoothstep = (value: number, from: number, to: number) => {
  const t = clamp((value - from) / (to - from));
  return t * t * (3 - 2 * t);
};

/** Keys that scroll the page, and which way. */
const KEYS: Record<string, 1 | -1> = { ArrowDown: 1, PageDown: 1, ' ': 1, ArrowUp: -1, PageUp: -1 };

/**
 * Staged cinematic hero. The page stays at the top while the stages play: one deliberate scroll starts the next stage, which
 * plays on the renderer's own clock to its last frame and holds there until the next scroll; scrolling up plays the current stage
 * back. After the last stage the next scroll goes to the page as usual. The hero is one scene on the site's shared animation
 * scheduler (no second loop); the frames are drawn by the renderer (a worker where supported), never through React state.
 *
 * Until the last stage has played, the page itself is held at the top (html.mm-hero-lock, the same overflow lock the loader uses), so
 * no wheel, key (End, Ctrl+End), scrollbar drag or middle-click autoscroll can show the next section before the final frame. Following
 * a link or moving keyboard focus further down still moves the page, so keyboard users are never trapped; the hold then lets go until
 * the page is back at the top. It also lets go while a stage gets no frames at all (STALL_MS). With reduced motion the introduction is
 * the hero, as before, and nothing is held.
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
    let failed = false;
    /** Resetting while frames are visible waits until the frames fade out before rewinding the canvas to frame 1. */
    let pendingResetFrame = false;
    let rewinding = false;
    /** A stage has had no frame download or decode for STALL_MS (see STALL_MS); the page is held at the top (see updateLock). */
    let stalled = false, stallTimer = 0, locked = false;

    /** Hold the page at the top while the hero is there and still has stages to play (see the component comment). */
    const updateLock = () => {
      const hold = !!renderer && !failed && !stalled && window.scrollY <= TOP_PX && (playing !== null || done < total);
      if (hold === locked) return;
      locked = hold;
      document.documentElement.classList.toggle('mm-hero-lock', hold);
    };
    /** While a stage is playing (or waiting for its frames), watch that frames keep arriving. */
    const armStall = () => {
      window.clearTimeout(stallTimer);
      stallTimer = playing ? window.setTimeout(() => { stalled = true; updateLock(); }, STALL_MS) : 0;
    };
    const progressed = () => {
      if (stalled) { stalled = false; updateLock(); }
      if (playing) armStall();
    };

    const paintLayers = () => {
      // The introduction lifts away; hidden (not removed) only once fully transparent.
      const out = smoothstep(intro, 0, 0.75);
      writeStyle(content, 'opacity', (1 - out).toFixed(3));
      writeStyle(content, 'transform', out ? `translate3d(0,${(-50 * out).toFixed(1)}px,0) scale(${(1 - 0.04 * out).toFixed(4)})` : '');
      writeStyle(hint, 'opacity', (1 - clamp(out * 3)).toFixed(3));
      const hidden = out > 0.995;
      if (hidden !== textHidden) { textHidden = hidden; writeStyle(content, 'visibility', hidden ? 'hidden' : 'visible'); }
      // The frames fade in over the maroon; the veil eases to a light vignette. While the frames are hidden they are not quite at 0:
      // the browser stops presenting a canvas it does not draw at all, and needs 100-200 ms to start again, which the first stage's
      // opening frames then lost (measured: their first gap 110-200 ms instead of 62). At 1%, under the introduction's 45-92% maroon
      // veil, the frame is invisible (at most ~2 grey levels).
      const reveal = smoothstep(intro, 0, FRAMES_IN) * smoothstep(restoreReveal, 0, 1);
      writeStyle(media, 'opacity', (renderer && !failed ? Math.max(HIDDEN_FRAMES, reveal) : reveal).toFixed(3));
      writeStyle(veil, 'opacity', (1 - 0.7 * reveal).toFixed(3));
    };

    // Reduced motion: no stages and no frame downloads; the maroon introduction is the hero.
    const renderer = !reducedAtStart && frameUrls.length > 1
      ? createHeroRenderer(canvas, poster, profile, {
        onReady: () => canvas.classList.add('is-ready'),
        // Frame 1 is decoded: the site loader may lift, and the frames after it may start to load.
        onCritical: () => { markHeroReady(); warm(); },
        onPlayed: position => finish(position),
        onFailed: () => { failed = true; updateLock(); controller.invalidate(); },
        onProgress: () => progressed(),
      })
      : null;
    if (!renderer) markHeroReady();
    if (renderer && restored) {
      // Bring the final frame back (a stage of no length that ends on it): the hero is complete again once it is on the canvas.
      playing = { dir: 1, done: total };
      renderer.play(STAGES.rest(total), STAGES.rest(total), 1);
      armStall();
    } else renderer?.seek(STAGES.rest(0));
    updateLock();

    // Warm-up starts immediately after frame 1 is drawn: frame 1 has the network to itself until it arrives, then low-priority
    // worker requests build a decoded runway while the visitor reads the introduction without blocking the page thread.
    let idle = 0, warmed = false;
    const warm = () => {
      if (warmed || !renderer) return;
      warmed = true;
      idle = window.setTimeout(() => renderer.allowWarm(), 0);
    };

    /** Have the stages either side of the frame at rest ready to play. */
    const prepare = (at: number, direction: 1 | -1) => {
      const ranges: [number, number][] = [];
      for (const next of [at + direction, at - direction]) {
        if (next >= 0 && next <= total) ranges.push([STAGES.rest(at), STAGES.rest(next)]);
      }
      renderer?.prepare(ranges);
    };
    prepare(restored ? total : 0, restored ? -1 : 1);

    /** Start the next stage (dir 1) or play the current one back (dir -1). A playing stage is never interrupted. */
    const start = (dir: 1 | -1) => {
      if (!renderer || playing || pendingResetFrame || rewinding || (dir > 0 ? done >= total : done <= 0)) return;
      const k = dir > 0 ? done : done - 1;
      const { start: first, end: last, ms } = STAGES.stages[k];
      playing = { dir, done: done + dir };
      // Playing back from the end: the hero is no longer complete, so a reload from here starts it again.
      if (dir < 0) rememberHeroCompleted(false);
      renderer.play(dir > 0 ? first : last, dir > 0 ? last : first, ms);
      prepare(playing.done, dir);
      armStall();
      updateLock();
      controller.invalidate();
    };
    /** The stage's last frame is on the canvas: hold it until the next scroll. */
    const finish = (position: number) => {
      if (rewinding && position === STAGES.rest(0)) {
        rewinding = false;
        return;
      }
      if (!playing || position !== STAGES.rest(playing.done)) return;
      const direction = playing.dir;
      done = playing.done;
      playing = null;
      restoring = false;
      stalled = false;
      armStall();
      // The final frame is on screen: the next scroll moves on to the next section.
      updateLock();
      rememberHeroCompleted(done === total);
      prepare(done, direction);
      if (track.getBoundingClientRect().bottom < -50) renderer?.rest();
      controller.invalidate();
    };

    /**
     * Whether a scroll in this direction belongs to the hero rather than the page: the hero is fully in view at the top, and a
     * stage is playing (every scroll is held then) or there is a stage to play that way.
     */
    const owns = (dir: 1 | -1) => !!renderer && !failed && !stalled && window.scrollY <= TOP_PX
      && !document.documentElement.classList.contains('mm-menu-open')
      && (playing !== null || (dir > 0 ? done < total : done > 0));
    const atFinalHold = (dir: 1 | -1) => !!renderer && !failed && !playing
      && dir === 1 && done === total && window.scrollY <= TOP_PX;

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
      if (!owns(dir)) {
        // Momentum from the last stage cannot release the page. A fresh downward wheel gesture can.
        if (gestureSpent && atFinalHold(dir)) event.preventDefault();
        gestureSpent = true;
        return;
      }
      event.preventDefault();
      // A gesture that arrived during playback is spent, including its momentum after the endpoint.
      if (playing) { gestureSpent = true; return; }
      if (gestureSpent) return;
      gestureSpent = true;
      start(dir);
    };

    // Touch: one swipe, one stage. Whether a swipe belongs to the hero is decided on its first movement, so the page never
    // starts scrolling under a stage; a tap (no movement) is left alone, so the buttons work.
    let touch: { y: number; owned: boolean | null; used: boolean } | null = null;
    const onTouchStart = (event: TouchEvent) => {
      touch = event.touches.length === 1 ? { y: event.touches[0].clientY, owned: null, used: !!playing } : null;
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
      if (!owns(dir)) {
        if (event.repeat && atFinalHold(dir)) event.preventDefault();
        return;
      }
      event.preventDefault();
      if (playing || event.repeat) return;
      start(dir);
    };

    /**
     * The canvas's size in device pixels as the browser lays it out. At a fractional scale (a Windows laptop at 125%) CSS size × DPR
     * can round one pixel off the box the browser actually composites the canvas into (868 rows squeezed into 867), and the browser
     * then resamples the whole frame a second time: measured 0.61 of the ideal sharpness at 125%, against 1.00 at the exact size.
     * null = not known.
     */
    let devicePixels: { width: number; height: number } | null = null;
    const sizer = renderer && typeof ResizeObserver === 'function'
      ? new ResizeObserver(([entry]) => {
        const box = entry.devicePixelContentBoxSize?.[0];
        const next = box ? { width: box.inlineSize, height: box.blockSize } : null;
        if (next?.width === devicePixels?.width && next?.height === devicePixels?.height) return;
        devicePixels = next;
        controller.invalidate();
      })
      : null;
    // Browsers without the device-pixel box (Safari) throw on the option: they keep CSS size × DPR.
    try { sizer?.observe(canvas, { box: 'device-pixel-content-box' }); } catch { sizer?.disconnect(); }

    if (renderer) {
      window.addEventListener('wheel', onWheel, { passive: false });
      window.addEventListener('touchstart', onTouchStart, { passive: true });
      window.addEventListener('touchmove', onTouchMove, { passive: false });
      window.addEventListener('touchend', onTouchEnd, { passive: true });
      window.addEventListener('touchcancel', onTouchEnd, { passive: true });
      window.addEventListener('keydown', onKeyDown);
      // A link or keyboard focus moved the page: let it go; hold it again once it is back at the top.
      window.addEventListener('scroll', updateLock, { passive: true });
    }

    const rewindToFrameZero = () => {
      pendingResetFrame = false;
      if (!renderer) return;
      rewinding = true;
      renderer.play(STAGES.rest(0), STAGES.rest(0), 1);
      prepare(0, 1);
    };

    const stopHeroReset = onHeroReset(() => {
      rememberHeroCompleted(false);
      gestureSpent = false;
      touch = null;
      if (done === 0 && !playing && !restoring && intro === 0) {
        controller.invalidate();
        return;
      }
      done = 0;
      playing = null;
      restoring = false;
      restoreReveal = 1;
      stalled = false;
      armStall();
      updateLock();
      const offscreen = track.getBoundingClientRect().bottom <= 0;
      if (offscreen || intro <= 0.2) {
        intro = 0;
        paintLayers();
        rewindToFrameZero();
      } else {
        // Hero frames are currently on screen: fade back to the intro first, then rewind the canvas once hidden.
        pendingResetFrame = true;
      }
      controller.invalidate();
    });

    return {
      id: 'hero-sequence',
      element: track,
      layout() {
        if (!renderer) return;
        // The canvas has one pixel per device pixel, so the browser shows it as drawn and never resamples it again: the frame is
        // resampled once, from the full-resolution original, by the renderer (GPU Lanczos where available). That includes screens
        // with more pixels than the 1920 px source (2× laptops, 4K): the renderer's upscale is sharper than the compositor's stretch.
        const { width, height } = canvas.getBoundingClientRect();
        if (!width || !height) return;
        const dpr = window.devicePixelRatio || 1;
        let canvasWidth = Math.round(width * dpr), canvasHeight = Math.round(height * dpr);
        // The browser's own device-pixel box, when it is the same size give or take its rounding. (DevTools device emulation reports
        // CSS pixels there; it is then ignored.)
        if (devicePixels && Math.abs(devicePixels.width - width * dpr) <= 1.5 && Math.abs(devicePixels.height - height * dpr) <= 1.5) {
          canvasWidth = devicePixels.width;
          canvasHeight = devicePixels.height;
        }
        // Safety net for extreme screens only (a 5K display): above the device budget the canvas is drawn smaller and stretched.
        const cap = Math.min(1, profile.maxDpr / dpr, Math.sqrt(profile.maxArea / Math.max(1, canvasWidth * canvasHeight)));
        if (cap < 1) { canvasWidth = Math.round(canvasWidth * cap); canvasHeight = Math.round(canvasHeight * cap); }
        const { width: sourceWidth, height: sourceHeight } = SOURCE_SIZE;
        const scale = frameScale(canvasWidth, canvasHeight, sourceWidth, sourceHeight);
        const w = Math.round(sourceWidth * scale), h = Math.round(sourceHeight * scale);
        // The whole frame, centred; the surrounding letterbox is solid maroon.
        const x = Math.round((canvasWidth - w) / 2);
        const y = Math.round((canvasHeight - h) / 2);
        renderer.layout({
          canvasWidth, canvasHeight,
          x, y, w, h,
          cover: w >= canvasWidth && h >= canvasHeight,
        });
      },
      update(_, frame) {
        // The introduction gives way to the frames as the first stage starts, and comes back once it has been played back.
        const target = renderer && !failed && (done > 0 || playing?.dir === 1) ? 1 : 0;
        if (frame.reducedMotion) intro = target;
        else intro = target > intro ? Math.min(target, intro + frame.deltaTime * 1000 / INTRO_MS) : Math.max(target, intro - frame.deltaTime * 1000 / INTRO_MS);

        if (!restoring && restoreReveal < 1) restoreReveal = frame.reducedMotion ? 1 : Math.min(1, restoreReveal + frame.deltaTime * 1000 / RESTORE_FADE_MS);
        paintLayers();
        if (pendingResetFrame && intro <= 0.2) rewindToFrameZero();
        return intro !== target || (!restoring && restoreReveal < 1);
      },
      // Back in view: decode the frames around the one at rest again.
      enter() {
        if (!playing && !pendingResetFrame && !rewinding) renderer?.seek(STAGES.rest(done));
      },
      // Scrolled past the hero: free the decoded frames (the next visit to the hero decodes them again in ~0.1 s).
      leave() {
        renderer?.rest();
      },
      dispose() {
        stopHeroReset();
        sizer?.disconnect();
        window.clearTimeout(stallTimer);
        window.removeEventListener('scroll', updateLock);
        if (locked) document.documentElement.classList.remove('mm-hero-lock');
        window.removeEventListener('wheel', onWheel);
        window.removeEventListener('touchstart', onTouchStart);
        window.removeEventListener('touchmove', onTouchMove);
        window.removeEventListener('touchend', onTouchEnd);
        window.removeEventListener('touchcancel', onTouchEnd);
        window.removeEventListener('keydown', onKeyDown);
        if (idle) window.clearTimeout(idle);
        renderer?.dispose();
      },
    };
  });

  let index = 0;
  return <section className="mm-hero-seq" ref={trackRef} aria-labelledby="hero-title">
    <div className="mm-hero">
      <div className="mm-hero__media" aria-hidden="true">
        {/* Frame 1: the canvas's first frame, and the frame shown if the sequence cannot load. Hidden until the first stage starts. */}
        <img className="mm-hero__poster" src={frameUrls[0]} alt="" width={1920} height={1088} loading="eager" fetchPriority="high" decoding="async" data-frame-sequence="" />
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
