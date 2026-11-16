import { useEffect, useRef } from 'react';
import { LotusOrnament } from '../../components/common/LotusOrnament';
import { SourceImage } from '../../components/common/SourceImage';
import { testimonials } from '../../data/testimonials';
import type { Testimonial } from '../../data/testimonials';
import './Testimonials.css';

/** Drift speed in CSS pixels per second, identical on every screen size. */
const SPEED = 26;
/** Time constant (s) for easing the drift to a stop on hover and back again. */
const EASE = 0.35;
/** After a touch drag, wait this long before drifting resumes. */
const TOUCH_RESUME_MS = 900;
/** Clamp long frames (tab switch, GC) so the track never jumps. */
const MAX_DT = 0.05;

function TestimonialCard({ item }: { item: Testimonial }) {
  const meta = [item.ceremony, item.location].filter(Boolean).join(' · ');
  return <li className="tm-card" data-placeholder={item.placeholder || undefined}>
    <figure className="tm-card-inner">
      <div className="tm-top">
        <svg className="tm-mark" viewBox="0 0 40 30" aria-hidden="true">
          <path d="M16 2C8 4.5 2 11 2 19.5 2 25 5.5 28 9.5 28c4 0 7-3 7-7 0-3.8-2.8-6.5-6.4-6.5-.8 0-1.4.1-2 .3C9.3 10 12.6 6.5 17 4.8zM37 2c-8 2.5-14 9-14 17.5 0 5.5 3.5 8.5 7.5 8.5 4 0 7-3 7-7 0-3.8-2.8-6.5-6.4-6.5-.8 0-1.4.1-2 .3C30.3 10 33.6 6.5 38 4.8z" fill="currentColor" />
        </svg>
      </div>
      <blockquote className="tm-quote"><p>“{item.quote}”</p></blockquote>
      <figcaption className="tm-author">
        <span className="tm-photo">
          {item.image ? <SourceImage asset={item.image} alt={`${item.name}, illustrative portrait`} draggable={false} /> : null}
        </span>
        <span className="tm-who">
          <cite className="tm-name">{item.name}</cite>
          <span className="tm-meta">{meta}</span>
        </span>
      </figcaption>
    </figure>
  </li>;
}

export function Testimonials() {
  const ref = useRef<HTMLElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  // One-time entrance for the heading and carousel.
  useEffect(() => {
    const section = ref.current;
    if (!section) return;
    if (!('IntersectionObserver' in window)) { section.classList.add('is-in'); return; }
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      section.classList.add('is-in');
      observer.disconnect();
    }, { threshold: 0.12 });
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  // Continuous drift. All per-frame work writes one transform; no React state.
  useEffect(() => {
    const viewport = viewportRef.current;
    const track = trackRef.current;
    const group = track?.firstElementChild as HTMLElement | null;
    if (!viewport || !track || !group) return;

    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let loopWidth = 0;      // width of one full set of cards incl. its trailing gap
    let offset = 0;         // px travelled, kept within [0, loopWidth)
    let rate = 1;           // 0..1, eased multiplier of SPEED
    let target = 1;
    let raf = 0;
    let last = 0;
    let inView = false;
    let hovering = false;
    let dragging = false;
    let dragId = -1;
    let dragX = 0;
    let resumeTimer = 0;

    const wrap = () => {
      if (loopWidth > 0) offset = ((offset % loopWidth) + loopWidth) % loopWidth;
    };
    const paint = () => { track.style.transform = `translate3d(${(-offset).toFixed(2)}px,0,0)`; };
    const measure = () => {
      loopWidth = group.getBoundingClientRect().width;
      wrap();
      paint();
    };

    const frame = (now: number) => {
      raf = 0;
      const dt = last ? Math.min(MAX_DT, (now - last) / 1000) : 0;
      last = now;
      rate += (target - rate) * (1 - Math.exp(-dt / EASE));
      if (Math.abs(target - rate) < 0.001) rate = target;
      if (!dragging && loopWidth > 0) {
        offset += SPEED * rate * dt;
        wrap();
        paint();
      }
      if (shouldRun()) raf = requestAnimationFrame(frame);
    };
    const shouldRun = () => inView && !document.hidden && !reduced.matches && (rate > 0 || target > 0 || dragging);
    const start = () => {
      if (raf || !shouldRun()) return;
      last = 0;
      raf = requestAnimationFrame(frame);
    };
    const stop = () => { cancelAnimationFrame(raf); raf = 0; };
    const updateTarget = () => {
      target = hovering || dragging || resumeTimer ? 0 : 1;
      start();
    };

    // Hover (mouse only) eases to a stop and back.
    const onEnter = (event: PointerEvent) => { if (event.pointerType === 'mouse') { hovering = true; updateTarget(); } };
    const onLeave = (event: PointerEvent) => { if (event.pointerType === 'mouse') { hovering = false; updateTarget(); } };

    // Touch / pen: drag the track horizontally; vertical gestures stay native (touch-action: pan-y).
    const onDown = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' || reduced.matches) return;
      window.clearTimeout(resumeTimer); resumeTimer = 0;
      dragging = true; dragId = event.pointerId; dragX = event.clientX;
      rate = 0;
      updateTarget();
    };
    const onMove = (event: PointerEvent) => {
      if (!dragging || event.pointerId !== dragId) return;
      offset -= event.clientX - dragX;
      dragX = event.clientX;
      wrap();
      paint();
    };
    const onUp = (event: PointerEvent) => {
      if (!dragging || event.pointerId !== dragId) return;
      dragging = false; dragId = -1;
      resumeTimer = window.setTimeout(() => { resumeTimer = 0; updateTarget(); }, TOUCH_RESUME_MS);
      updateTarget();
    };

    const onVisibility = () => { if (document.hidden) stop(); else start(); };
    const onMotion = () => {
      if (reduced.matches) { stop(); offset = 0; track.style.transform = ''; }
      else { measure(); start(); }
    };

    const resize = new ResizeObserver(() => { if (!reduced.matches) measure(); });
    resize.observe(group);
    const visibility = new IntersectionObserver(entries => {
      inView = entries.some(entry => entry.isIntersecting);
      if (inView) start(); else stop();
    }, { rootMargin: '120px 0px' });
    visibility.observe(viewport);

    viewport.addEventListener('pointerenter', onEnter);
    viewport.addEventListener('pointerleave', onLeave);
    viewport.addEventListener('pointerdown', onDown);
    viewport.addEventListener('pointermove', onMove);
    viewport.addEventListener('pointerup', onUp);
    viewport.addEventListener('pointercancel', onUp);
    document.addEventListener('visibilitychange', onVisibility);
    reduced.addEventListener('change', onMotion);
    if (!reduced.matches) measure();

    return () => {
      stop();
      window.clearTimeout(resumeTimer);
      resize.disconnect();
      visibility.disconnect();
      viewport.removeEventListener('pointerenter', onEnter);
      viewport.removeEventListener('pointerleave', onLeave);
      viewport.removeEventListener('pointerdown', onDown);
      viewport.removeEventListener('pointermove', onMove);
      viewport.removeEventListener('pointerup', onUp);
      viewport.removeEventListener('pointercancel', onUp);
      document.removeEventListener('visibilitychange', onVisibility);
      reduced.removeEventListener('change', onMotion);
      track.style.transform = '';
    };
  }, []);

  if (!testimonials.length) return null;

  return <section className="tm" id="testimonials" aria-labelledby="tm-title" ref={ref}>
    <div className="wrap">
      <header className="tm-head">
        <LotusOrnament />
        <span className="label">Kind words</span>
        <h2 id="tm-title">Words from Our Grooms</h2>
        <p className="lede">Every detail tells a story. Discover what our grooms have to say about their experience with Mister Mapillai.</p>
      </header>

      <div className="tm-carousel" ref={viewportRef} role="region" aria-roledescription="carousel" aria-label="Groom testimonials">
        <div className="tm-track" ref={trackRef}>
          <ul className="tm-group" aria-label="Customer reviews">
            {testimonials.map(item => <TestimonialCard item={item} key={item.id} />)}
          </ul>
          {/* Identical second set so the loop wraps with no gap; hidden from assistive tech. */}
          <ul className="tm-group tm-clone" aria-hidden="true" inert>
            {testimonials.map(item => <TestimonialCard item={item} key={item.id} />)}
          </ul>
        </div>
      </div>
    </div>
  </section>;
}
