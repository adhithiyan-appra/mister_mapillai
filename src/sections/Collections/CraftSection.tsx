import { useEffect, useRef } from 'react';
import { ceremonyAssets } from '../../data/assets';
import { bookingHref } from '../../data/navigation';
import { craftHighlights } from '../../data/showcase';
import { writeVariable } from '../../utils/animation';

export function CraftSection() {
  const frameRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // The picture, the copy and the list items come in through the page's one scroll reveal (.mm-reveal, see
  // hooks/useReveal.ts). Only the parallax lives here, and it listens to scroll only while the frame is near the viewport.
  useEffect(() => {
    const frame = frameRef.current;
    const image = imageRef.current;
    if (!frame || !image) return;

    const motion = matchMedia('(prefers-reduced-motion: reduce)');
    let raf = 0;
    let listening = false;

    const paint = () => {
      raf = 0;
      if (motion.matches) return;
      const rect = frame.getBoundingClientRect();
      const offset = (rect.top - window.innerHeight * 0.5) * -0.12;
      writeVariable(image, '--craft-parallax', `${offset.toFixed(2)}px`);
    };

    const request = () => {
      if (!raf) raf = requestAnimationFrame(paint);
    };

    const start = () => {
      if (listening) return;
      listening = true;
      window.addEventListener('scroll', request, { passive: true });
      window.addEventListener('resize', request);
      request();
    };

    const stop = () => {
      if (!listening) return;
      listening = false;
      window.removeEventListener('scroll', request);
      window.removeEventListener('resize', request);
      cancelAnimationFrame(raf);
      raf = 0;
    };

    const onMotionChange = () => {
      if (!motion.matches) return;
      writeVariable(image, '--craft-parallax', '0px');
      cancelAnimationFrame(raf);
      raf = 0;
    };

    // Starts a quarter of a screen before the frame is visible, so the first painted value is already right.
    const watcher = 'IntersectionObserver' in window
      ? new IntersectionObserver(([entry]) => { if (entry.isIntersecting) start(); else stop(); }, { rootMargin: '25% 0px' })
      : null;
    if (watcher) watcher.observe(frame); else start();
    motion.addEventListener('change', onMotionChange);

    return () => {
      watcher?.disconnect();
      stop();
      motion.removeEventListener('change', onMotionChange);
    };
  }, []);

  return <section className="mm-sec mm-craft" aria-labelledby="craft-title">
    <div className="mm-container mm-split mm-craft__layout">
      <div className="mm-craft__frame mm-reveal mm-reveal--left" ref={frameRef}>
        <img ref={imageRef} src={ceremonyAssets.chairCoat} alt="Tailored coat displayed on a chair" width="1254" height="1254" loading="lazy" decoding="async" />
      </div>
      <div className="mm-craft__copy mm-reveal mm-reveal--right">
        <span className="mm-eyebrow">FABRIC &amp; CRAFT</span>
        <h2 className="mm-title" id="craft-title">Made by Hand.<br /><em>Made to Last.</em></h2>
        <div className="mm-gold-line mm-gold-line--static" aria-hidden="true" />
        <ul className="mm-list mm-craft__list">
          {craftHighlights.map((item, i) => <li className="mm-reveal" key={item}>
            <b>{String(i + 1).padStart(2, '0')}</b>
            <span>{item}</span>
          </li>)}
        </ul>
        <a href={bookingHref()} className="mm-btn mm-btn--dark mm-craft__cta">DIDN'T FIND YOUR THEME? WE DESIGN IT →</a>
      </div>
    </div>
  </section>;
}
