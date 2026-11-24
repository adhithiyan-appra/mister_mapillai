import { Fragment, useRef } from 'react';
import { useSceneAnimation } from '../../components/animations/AnimationProvider';
import { fittingHref } from '../../data/navigation';
import { clamp, writeStyle } from '../../utils/animation';
import { cssVars } from '../../utils/style';
import { markHeroReady } from '../../utils/heroReady';
import { SOURCE_SIZE, createHeroRenderer, deviceProfile, frameScale, frameUrls } from './heroFrames';

const lines: readonly (readonly [word: string, gold?: boolean][])[] = [
  [['Crafted'], ['for'], ['the'], ['Groom.', true]],
  [['Styled'], ['Head'], ['to'], ['Toe.']],
];

/**
 * Share of the pinned scroll that is animated; the rest holds the final frame before release.
 * At 0.88, the last ~12% of the pinned scroll holds frame 202 cleanly while still pinned, so even
 * brisk desktop scrolls or rapid mobile/tablet swipes always complete the full sequence before
 * the hero unsticks and reveals the next section.
 */
const PLAY = 0.88;
/** Phase 2: the introduction lifts away (opacity, -50px, scale 0.96) as soon as scrolling starts… */
const TEXT_OUT: readonly [number, number] = [0.004, 0.1];
/** …while the cinematic frames fade in over the maroon… */
const FRAMES_IN: readonly [number, number] = [0.03, 0.12];
/** …and only then (phase 3) do the frames start to advance with the scroll. */
const FRAMES_START = 0.12;
/** Scroll progress at which the visitor is taken to be scrolling into the sequence: its frames start to be fetched. */
const ENGAGE_AT = 0.004;
/**
 * The pinned scroll is as long as the frame count needs (template.css: frame steps × a pace in svh per frame, divided by the share
 * of the scroll that plays frames), so a longer or shorter sequence keeps the same, slow pace instead of racing or crawling.
 */
const FRAME_SHARE = PLAY * (1 - FRAMES_START);
/**
 * Glide (1/s) of the introduction's fade and lift: small scroll steps ease in smoothly over
 * ~125 ms. The frames do not use this: their playhead glides inside the renderer,
 * on its own clock, at a speed the decoded frames can sustain (see frameRenderer.ts).
 */
const GLIDE_RESPONSE = 8;
/**
 * The pinned scroll only releases the stage once the final frame is on the canvas. A scroll that outruns the playhead (a hard fling,
 * the End key, frames still arriving) keeps the stage held in place, over the next section, until the last frame has been drawn;
 * then the stage glides away. The hold gives up when the picture stalls or after a cap, so a sequence that cannot finish (offline, a failed fetch) never traps the visitor.
 */
const HOLD_STALL_MS = 2500;
const HOLD_CAP_MS = 15000;
/** Glide (1/s) of the released stage, and its top speed in stage heights per second. */
const RELEASE_RESPONSE = 5;
const RELEASE_MAX_SPEED = 2.5;

const smoothstep = (value: number, from: number, to: number) => {
  const t = clamp((value - from) / (to - from));
  return t * t * (3 - 2 * t);
};

/**
 * Scroll-driven hero: the section is pinned while the page scrolls through it
 * and the scroll position selects the frame. It runs as one scene on the
 * site's shared animation scheduler (no second scroll loop): frames are drawn
 * to a canvas only when the frame index changes, never through React state.
 */
export function HeroSection() {
  const trackRef = useRef<HTMLElement>(null);

  useSceneAnimation(trackRef, track => {
    const stage = track.querySelector<HTMLElement>('.mm-hero')!;
    const canvas = stage.querySelector<HTMLCanvasElement>('.mm-hero__canvas')!;
    const poster = stage.querySelector<HTMLImageElement>('.mm-hero__poster')!;
    const content = stage.querySelector<HTMLElement>('.mm-hero__content')!;
    const media = stage.querySelector<HTMLElement>('.mm-hero__media')!;
    const veil = stage.querySelector<HTMLElement>('.mm-hero__veil')!;
    const hint = stage.querySelector<HTMLElement>('.mm-scroll-hint')!;
    const profile = deviceProfile();
    const reducedAtStart = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const count = frameUrls.length;

    let pinStart = 0, range = 1;
    let progress = 0, synced = false;
    let textHidden = false;
    // Hold on release: `held` is how far (px) the stage is kept below where the scroll has carried it.
    let ended = false, shownAt = 0, held = 0, holdSince = 0, forced = false, placed = false, holding = false;

    // Reduced motion: no pinned sequence and no frame downloads; the maroon introduction is the hero.
    const renderer = !reducedAtStart && count > 1
      ? createHeroRenderer(canvas, poster, profile, {
        onReady: () => canvas.classList.add('is-ready'),
        // The opening frames are decoded: the site loader may lift.
        onCritical: markHeroReady,
        // A new frame is on the canvas; once it is the final one the stage may be released (and it is held again if it leaves).
        onShown: value => { ended = value; shownAt = performance.now(); },
      })
      : null;
    if (!renderer) markHeroReady();

    // The warm-up of the frames after the opening ones waits until the page has loaded its own resources and the browser is idle,
    // so the hero never competes with fonts and images during the first seconds. (Scrolling engages the loader sooner.)
    let stopWarm = () => {};
    if (renderer) {
      let idle = 0;
      const warm = () => {
        idle = typeof window.requestIdleCallback === 'function' ? window.requestIdleCallback(() => renderer.allowWarm(), { timeout: 2500 }) : window.setTimeout(() => renderer.allowWarm(), 400);
      };
      if (document.readyState === 'complete') warm();
      else window.addEventListener('load', warm, { once: true });
      stopWarm = () => {
        window.removeEventListener('load', warm);
        if (idle) { if (typeof window.cancelIdleCallback === 'function') window.cancelIdleCallback(idle); else window.clearTimeout(idle); }
      };
    }

    return {
      id: 'hero-sequence',
      element: track,
      scrollDriven: true,
      // A held stage is still on screen after its track has scrolled away.
      keepAlive: () => holding || held > 0,
      layout(frame) {
        const box = track.getBoundingClientRect();
        const stageHeight = stage.offsetHeight;
        const stageStyle = getComputedStyle(stage);
        const stickyTop = parseFloat(stageStyle.top) || 0;
        // Phones and tablets (template.css) set --mm-hero-ambient: the space around the whole frame is then a soft wash
        // of its own edge colours instead of flat maroon. Desktop leaves it unset (0).
        const ambient = Math.min(1, Math.max(0, parseFloat(stageStyle.getPropertyValue('--mm-hero-ambient')) || 0));
        // The stage sticks once the track reaches the bottom of the fixed navigation.
        pinStart = box.top + frame.scrollY - stickyTop;
        range = Math.max(1, track.offsetHeight - stageHeight);
        if (!renderer) return;
        // Canvas backing store in device pixels, capped by DPR and an area budget.
        const width = stage.clientWidth, height = stageHeight;
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
        const goal = clamp((frame.scrollY - pinStart) / range / PLAY);
        if (!synced || frame.reducedMotion) { progress = goal; synced = true; }
        else {
          // Frame-rate independent glide toward the scroll position (introduction only). Snapping
          // inside a third of a frame lands exactly on the scroll position.
          progress += (goal - progress) * (1 - Math.exp(-frame.deltaTime * GLIDE_RESPONSE));
          if (Math.abs(goal - progress) * (count - 1) < 0.35) progress = goal;
        }

        // Phase 2: the introduction lifts away; hidden (not removed) only once fully transparent.
        const out = frame.reducedMotion || !renderer ? 0 : smoothstep(progress, TEXT_OUT[0], TEXT_OUT[1]);
        writeStyle(content, 'opacity', (1 - out).toFixed(3));
        writeStyle(content, 'transform', out ? `translate3d(0,${(-50 * out).toFixed(1)}px,0) scale(${(1 - 0.04 * out).toFixed(4)})` : '');
        writeStyle(hint, 'opacity', (1 - clamp(out * 3)).toFixed(3));
        const hidden = out > 0.995;
        if (hidden !== textHidden) { textHidden = hidden; writeStyle(content, 'visibility', hidden ? 'hidden' : 'visible'); }
        // The frames fade in over the maroon; the veil eases to a light vignette.
        const reveal = renderer ? smoothstep(progress, FRAMES_IN[0], FRAMES_IN[1]) : 0;
        writeStyle(media, 'opacity', reveal.toFixed(3));
        writeStyle(veil, 'opacity', (1 - 0.7 * reveal).toFixed(3));

        // Phase 3: frames follow the scroll. The renderer's playhead glides to this (fractional) frame itself.
        // Fetching starts with the first scroll (phase 2), well before the playhead leaves frame 1.
        if (goal > ENGAGE_AT) renderer?.engage();
        renderer?.seek(clamp((goal - FRAMES_START) / (1 - FRAMES_START)) * (count - 1));

        // Release: the stage unsticks at the end of the pinned scroll, but never before the final frame has been drawn.
        const over = Math.max(0, frame.scrollY - (pinStart + range));
        if (!renderer || frame.reducedMotion || over === 0) { forced = false; holdSince = 0; held = 0; holding = false; }
        else {
          // A page opened already scrolled past the hero (reload, deep link) is not scrolling through it: no hold.
          if (!placed) forced = true;
          holding = !forced && !ended;
          if (holding) {
            const now = performance.now();
            holdSince ||= now;
            // Still playing out: hold. Nothing new on the canvas for a while (frames cannot be fetched), or far too long: let go.
            if (now - Math.max(holdSince, shownAt) > HOLD_STALL_MS || now - holdSince > HOLD_CAP_MS) { forced = true; holding = false; }
          }
          if (holding) held = over;
          else if (held > 0) {
            // Released: the stage glides on up from where it was held, at most a few stage heights per second.
            const stageHeight = stage.offsetHeight;
            held -= Math.min(held * (1 - Math.exp(-frame.deltaTime * RELEASE_RESPONSE)) + 0.5, stageHeight * RELEASE_MAX_SPEED * frame.deltaTime);
            held = held < 1 ? 0 : Math.min(held, over);
          }
        }
        placed = true;
        writeStyle(stage, 'transform', held > 0 ? `translate3d(0,${held.toFixed(1)}px,0)` : '');
        writeStyle(stage, 'zIndex', held > 0 ? '20' : '');
        return progress !== goal || holding || held > 0;
      },
      // Scrolled past the hero: free the decoded frames (the next visit to the hero decodes them again in ~0.1 s).
      leave() {
        renderer?.rest();
      },
      dispose() {
        stopWarm();
        renderer?.dispose();
      },
    };
  });

  let index = 0;
  return <section className="mm-hero-seq" ref={trackRef} aria-labelledby="hero-title" style={cssVars({ '--mm-hero-steps': Math.max(1, frameUrls.length - 1), '--mm-hero-share': FRAME_SHARE })}>
    <div className="mm-hero">
      <div className="mm-hero__media" aria-hidden="true">
        {/* Frame 1: the canvas's first frame, and the frame shown if the sequence cannot load. Hidden until scrolling starts. */}
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
