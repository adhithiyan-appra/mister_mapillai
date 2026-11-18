import { useEffect, useRef } from 'react';
import { BrandLogo } from '../common/BrandLogo';
import { generalEnquiry, whatsappUrl } from '../../data/contact';

/** Maroon curtain that lifts off each newly opened page (not the first load). */
export function PageCurtain({ routeKey }: { routeKey: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) { first.current = false; return; }
    const curtain = ref.current;
    if (!curtain || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    curtain.classList.remove('is-playing');
    void curtain.offsetWidth; // restart the animation
    curtain.classList.add('is-playing');
    const done = () => curtain.classList.remove('is-playing');
    curtain.addEventListener('animationend', done, { once: true });
    return () => curtain.removeEventListener('animationend', done);
  }, [routeKey]);
  return <div className="mm-curtain" ref={ref} aria-hidden="true" inert><BrandLogo /></div>;
}

/** Soft gold light that follows a fine pointer (mouse/trackpad only). */
export function CursorGlow() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const glow = ref.current;
    const fine = matchMedia('(hover: hover) and (pointer: fine)');
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    if (!glow || !fine.matches || reduced.matches) return;
    let raf = 0, x = 0, y = 0;
    const paint = () => { raf = 0; glow.style.transform = `translate3d(${x}px,${y}px,0)`; };
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      x = event.clientX; y = event.clientY;
      glow.classList.add('is-on');
      if (!raf) raf = requestAnimationFrame(paint);
    };
    const onLeave = () => glow.classList.remove('is-on');
    window.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('pointerleave', onLeave);
    };
  }, []);
  return <div className="mm-glow" ref={ref} aria-hidden="true" />;
}

/** Floating WhatsApp button, shown only when a studio number is configured. */
export function WhatsAppButton() {
  const href = whatsappUrl(generalEnquiry);
  if (!href) return null;
  return <a className="mm-fab" href={href} target="_blank" rel="noopener noreferrer" aria-label="Chat with Mister Mapillai on WhatsApp">
    <svg width="30" height="30" viewBox="0 0 24 24" fill="#fff" aria-hidden="true"><path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm5.3 14.1c-.2.6-1.3 1.2-1.8 1.2-.5.1-1 .2-3.3-.7-2.8-1.1-4.5-3.9-4.7-4.1-.1-.2-1.1-1.5-1.1-2.9s.7-2.1 1-2.4c.2-.3.5-.3.7-.3h.5c.2 0 .4 0 .6.5l.8 2c.1.2.1.3 0 .5l-.3.5-.4.4c-.1.1-.3.3-.1.6.2.3.7 1.2 1.6 2 1.1 1 2 1.3 2.3 1.4.3.1.4.1.6-.1l.8-1c.2-.3.4-.2.7-.1l1.9.9c.3.1.5.2.5.3.1.2.1.7-.1 1.3z" /></svg>
  </a>;
}
