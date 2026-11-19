import { useEffect, useRef, useState } from 'react';
import { BrandLogo } from '../common/BrandLogo';
import { HERO_CAP_MS, onHeroReady } from '../../utils/heroReady';

/** Shortest time the loader shows on the home page, so it never just flashes. */
const MIN_MS = 700;
/** Never hold a visitor longer than this: the hero text shows and frames keep loading behind it. */
const MAX_MS = HERO_CAP_MS;
const FADE_MS = 700;

type Phase = 'loading' | 'leaving' | 'gone';

/**
 * Initial site loader: deep maroon, a gold Lottie emblem and the brand lockup.
 * On the home page it lifts once the hero's opening frames are decoded; on any
 * other first page it lifts as soon as the app has rendered. It shows once per
 * visit. Lottie (light SVG build, ~45 KB gzipped) is loaded on demand, so the
 * loader itself never delays the page: a CSS ring stands in until it arrives,
 * and the same markup is in index.html before any script runs.
 */
export function SiteLoader({ waitForHero }: { waitForHero: boolean }) {
  const [phase, setPhase] = useState<Phase>('loading');
  const holder = useRef<HTMLDivElement>(null);
  const [animated, setAnimated] = useState(false);

  // Lift: wait for the hero (or not), respecting the minimum and maximum times.
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('mm-loading');
    // Both limits count from the start of navigation, so a slow script download is included.
    let timer = 0, lifted = false, frame = 0;
    const lift = () => {
      if (lifted) return;
      lifted = true;
      window.clearTimeout(maxTimer);
      const wait = waitForHero ? Math.max(0, MIN_MS - performance.now()) : 0;
      timer = window.setTimeout(() => {
        // Releasing the class starts the hero's entrance animation as the loader fades.
        root.classList.remove('mm-loading');
        setPhase('leaving');
        timer = window.setTimeout(() => setPhase('gone'), FADE_MS);
      }, wait);
    };
    const maxTimer = window.setTimeout(lift, Math.max(0, MAX_MS - performance.now()));
    // Other first pages: lift once the app has painted.
    const unsubscribe = waitForHero ? onHeroReady(lift) : () => {};
    if (!waitForHero) frame = requestAnimationFrame(lift);
    return () => {
      unsubscribe();
      cancelAnimationFrame(frame);
      window.clearTimeout(maxTimer);
      window.clearTimeout(timer);
      root.classList.remove('mm-loading');
    };
    // The loader runs once, for the first page of the visit.
  }, []);

  // Lottie emblem, loaded lazily; destroyed when the loader leaves.
  useEffect(() => {
    if (phase === 'gone') return;
    let live = true;
    let destroy = () => {};
    Promise.all([import('lottie-web/build/player/lottie_light'), import('../../assets/animations/lottie/mm-loader.json')])
      .then(([{ default: lottie }, { default: animationData }]) => {
        if (!live || !holder.current) return;
        const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
        const animation = lottie.loadAnimation({
          container: holder.current,
          renderer: 'svg',
          loop: !reduced,
          autoplay: !reduced,
          animationData,
          rendererSettings: { preserveAspectRatio: 'xMidYMid meet', progressiveLoad: false },
        });
        if (reduced) animation.goToAndStop(45, true);
        destroy = () => animation.destroy();
        setAnimated(true);
      })
      .catch(() => { /* the CSS ring stays */ });
    return () => { live = false; destroy(); };
  }, [phase === 'gone']);

  if (phase === 'gone') return null;
  return <div className={`mm-loader${phase === 'leaving' ? ' is-leaving' : ''}`} role="status" aria-live="polite" aria-label="Loading Mister Mapillai">
    <div className="mm-loader__emblem" aria-hidden="true">
      {animated ? null : <span className="mm-loader__ring" />}
      <div className="mm-loader__lottie" ref={holder} />
    </div>
    <div className="mm-loader__brand" aria-hidden="true" inert><BrandLogo /></div>
    <span className="mm-loader__tag" aria-hidden="true">Crafted for the Groom</span>
  </div>;
}
