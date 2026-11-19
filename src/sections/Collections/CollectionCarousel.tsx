import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent as ReactPointerEvent, Ref } from 'react';
import { SectionHeading } from '../../components/common/SectionHeading';
import { SourceImage } from '../../components/common/SourceImage';
import { bookingHref } from '../../data/navigation';
import { occasionText, outfits } from '../../data/outfits';
import { writeStyle } from '../../utils/animation';
import { prepareImageElement } from '../../utils/imageLoading';

const COUNT = outfits.length;
const STEP = 360 / COUNT;
const CYCLE = 360 * COUNT;
const LERP = 0.08;
const FRAME_MS = 1000 / 60;
const AUTO_SPEED = 7.2;
const DRAG_RATE = 0.35;
const RESUME_MS = 6000;
const DEPTH_RATIO = 0.5;
const SIDE_FADE_START = 1;
const SIDE_FADE_END = 2;

function wrap(value: number): number {
  return ((value % COUNT) + COUNT) % COUNT;
}

function wrapOffset(value: number): number {
  const half = COUNT / 2;
  return ((value + half) % COUNT + COUNT) % COUNT - half;
}

function cardOpacity(index: number, angle: number): number {
  const distance = Math.abs(wrapOffset(index + angle / STEP));
  return Math.max(0, Math.min(1, (SIDE_FADE_END - distance) / (SIDE_FADE_END - SIDE_FADE_START)));
}

function radiusFor(cardWidth: number): number {
  return Math.round(cardWidth / (2 * Math.tan(Math.PI / COUNT)) + cardWidth * 0.5);
}

const CarouselRing = memo(function CarouselRing({ ringRef }: { ringRef: Ref<HTMLDivElement> }) {
  return <div className="mm-ring3d" ref={ringRef}>
    {outfits.map((item, i) => {
      const dist = Math.min(i, COUNT - i);
      return <div className="mm-item3d" key={item.id} aria-hidden="true">
        <SourceImage
          asset={item.thumbnail}
          responsive
          sizes="(max-width: 900px) 190px, 260px"
          loading={dist <= 2 ? 'eager' : 'lazy'}
          fetchPriority={dist === 0 ? 'high' : dist <= 2 ? 'auto' : 'low'}
          alt=""
          draggable={false}
        />
        <div className="mm-item3d__cap"><small>{occasionText(item)}</small><b>{item.title}</b></div>
      </div>;
    })}
  </div>;
});

export function CollectionCarousel({ onOpen }: { onOpen: (id: string) => void }) {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const cardsRef = useRef<HTMLElement[]>([]);
  const radiusRef = useRef(430);
  const angleRef = useRef(0);
  const targetRef = useRef(0);
  const activeRef = useRef(-1);
  const dragRef = useRef<{ id: number; x: number; from: number } | null>(null);
  const manualRef = useRef(false);
  const resumeAtRef = useRef(0);
  const inViewRef = useRef(true);
  const reducedRef = useRef(false);
  const [active, setActive] = useState(0);
  const look = outfits[active];

  const writePositions = useCallback(() => {
    const radius = radiusRef.current;
    cardsRef.current.forEach((card, i) => {
      const degrees = i * STEP + angleRef.current;
      const radians = degrees * Math.PI / 180;
      const x = radius * Math.sin(radians);
      const z = radius * (Math.cos(radians) - 1) * DEPTH_RATIO;
      writeStyle(card, 'transform', `translate3d(${x.toFixed(2)}px,0,${z.toFixed(2)}px) rotateY(${degrees.toFixed(3)}deg)`);
      const opacity = cardOpacity(i, angleRef.current);
      writeStyle(card, 'opacity', opacity.toFixed(3));
      writeStyle(card, 'visibility', opacity > 0 ? 'visible' : 'hidden');
    });
  }, []);

  const applyCardLayout = useCallback(() => {
    const ring = ringRef.current;
    if (!ring) return;
    cardsRef.current = Array.from(ring.children) as HTMLElement[];
    const cardWidth = ring.offsetWidth || (window.innerWidth < 900 ? 190 : 260);
    radiusRef.current = radiusFor(cardWidth);
    writeStyle(ring, 'transform', 'translateZ(0)');
    writePositions();
  }, [writePositions]);

  const spin = useCallback((direction: number) => {
    manualRef.current = true;
    resumeAtRef.current = performance.now() + RESUME_MS;
    targetRef.current = Math.round(targetRef.current / STEP) * STEP + direction * STEP;
  }, []);

  useLayoutEffect(() => {
    applyCardLayout();
    const ring = ringRef.current;
    const resizeObserver = typeof ResizeObserver !== 'undefined' && ring ? new ResizeObserver(applyCardLayout) : null;
    if (ring) resizeObserver?.observe(ring);

    const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
    reducedRef.current = motion.matches;
    const onMotion = () => { reducedRef.current = motion.matches; };
    motion.addEventListener?.('change', onMotion);

    const section = sectionRef.current;
    const observer = typeof IntersectionObserver !== 'undefined' && section
      ? new IntersectionObserver(([entry]) => { inViewRef.current = entry.isIntersecting; }, { rootMargin: '80px' })
      : null;
    if (section) observer?.observe(section);

    return () => {
      resizeObserver?.disconnect();
      observer?.disconnect();
      motion.removeEventListener?.('change', onMotion);
    };
  }, [applyCardLayout]);

  useEffect(() => {
    let frame = 0;
    let previous = performance.now();
    const tick = (now: number) => {
      const elapsed = Math.min(now - previous, FRAME_MS * 3);
      previous = now;
      if (manualRef.current && !dragRef.current && now >= resumeAtRef.current) manualRef.current = false;
      const auto = !manualRef.current && !dragRef.current && inViewRef.current && !document.hidden && !reducedRef.current && now >= resumeAtRef.current;
      if (auto) targetRef.current -= AUTO_SPEED * elapsed / 1000;

      const factor = reducedRef.current ? 1 : 1 - Math.pow(1 - LERP, elapsed / FRAME_MS);
      angleRef.current += (targetRef.current - angleRef.current) * factor;

      const cycle = Math.trunc(targetRef.current / CYCLE);
      if (cycle !== 0) {
        targetRef.current -= cycle * CYCLE;
        angleRef.current -= cycle * CYCLE;
      }

      writePositions();

      const front = wrap(Math.round(-angleRef.current / STEP));
      if (front !== activeRef.current) {
        activeRef.current = front;
        cardsRef.current.forEach((card, i) => card.classList.toggle('is-front', i === front));
        setActive(front);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [writePositions]);

  useEffect(() => {
    const onMove = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || event.pointerId !== drag.id) return;
      targetRef.current = drag.from + (event.clientX - drag.x) * DRAG_RATE;
    };
    const onRelease = (event: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag || event.pointerId !== drag.id) return;
      dragRef.current = null;
      stageRef.current?.classList.remove('is-dragging');
      targetRef.current = Math.round(targetRef.current / STEP) * STEP;
      manualRef.current = false;
      resumeAtRef.current = performance.now() + RESUME_MS;
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onRelease);
    window.addEventListener('pointercancel', onRelease);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onRelease);
      window.removeEventListener('pointercancel', onRelease);
      if (dragRef.current) stageRef.current?.classList.remove('is-dragging');
    };
  }, []);

  useEffect(() => {
    const ring = ringRef.current;
    if (!ring) return;
    const images = Array.from(ring.querySelectorAll<HTMLImageElement>('img'));
    const target = images[active];
    if (target) void prepareImageElement(target, 'high');
    for (const offset of [-1, 1, -2, 2]) {
      const image = images[wrap(active + offset)];
      if (image) void prepareImageElement(image, 'high');
    }
  }, [active]);

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || dragRef.current) return;
    dragRef.current = { id: event.pointerId, x: event.clientX, from: targetRef.current };
    manualRef.current = true;
    stageRef.current?.classList.add('is-dragging');
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      spin(1);
    } else if (event.key === 'ArrowRight') {
      event.preventDefault();
      spin(-1);
    } else if (event.key === 'Enter') {
      onOpen(look.id);
    }
  };

  return <section className="mm-sec mm-carousel" ref={sectionRef} aria-labelledby="carousel-title">
    <div className="mm-container">
      <SectionHeading
        id="carousel-title"
        eyebrow="Signature Looks"
        title={<>Spin the <em>Collection</em></>}
        lead="Drag, swipe or use the arrows"
        line={false}
      />
    </div>
    <div
      className="mm-stage"
      ref={stageRef}
      role="group"
      tabIndex={0}
      onKeyDown={onKeyDown}
      onPointerDown={onPointerDown}
      aria-roledescription="carousel"
      aria-label="Signature looks. Use the left and right arrow keys to turn, Enter for details."
    >
      <CarouselRing ringRef={ringRef} />
    </div>
    <div className="mm-cctrl">
      <button type="button" aria-label="Previous look" onClick={() => spin(1)}>←</button>
      <button type="button" aria-label="Next look" onClick={() => spin(-1)}>→</button>
    </div>
    <div className="mm-cinfo" aria-live="polite">
      <div className="mm-cinfo__in" key={look.id}>
        <span className="mm-eyebrow">{occasionText(look)}{look.price ? ` · ${look.price}` : ''}</span>
        <h3>{look.title}</h3>
        <p>{look.description}</p>
        <a href={bookingHref(look.id)} className="mm-btn mm-btn--gold">Book This Look</a>
      </div>
    </div>
  </section>;
}
