import { memo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import { SectionHeading } from '../../components/common/SectionHeading';
import { SourceImage } from '../../components/common/SourceImage';
import { useSceneAnimation } from '../../components/animations/AnimationProvider';
import { bookingHref } from '../../data/navigation';
import { occasionText, outfits } from '../../data/outfits';
import { writeStyle } from '../../utils/animation';
import { prepareImageElement } from '../../utils/imageLoading';

/** Degrees per second of the idle spin, and how long a manual turn pauses it. */
const AUTO_SPEED = 7;
const RESUME_MS = 6000;
const DRAG_GAIN = 0.35;

interface CarouselApi { step: (delta: number) => void }

function circularDistance(a: number, b: number, count: number): number {
  const diff = Math.abs(a - b);
  return Math.min(diff, count - diff);
}

const CarouselRing = memo(function CarouselRing() {
  const count = outfits.length;
  return <div className="mm-ring3d">
    {outfits.map((item, i) => {
      const dist = circularDistance(i, 0, count);
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
  const ref = useRef<HTMLElement>(null);
  const api = useRef<CarouselApi | null>(null);
  const [front, setFront] = useState(0);
  const count = outfits.length;
  const look = outfits[front];

  useSceneAnimation(ref, (section, controller) => {
    const stage = section.querySelector<HTMLElement>('.mm-stage')!;
    const ring = section.querySelector<HTMLElement>('.mm-ring3d')!;
    const items = Array.from(ring.querySelectorAll<HTMLElement>('.mm-item3d'));
    const itemImages = items.map(item => item.querySelector<HTMLImageElement>('img'));
    const step = 360 / count;
    let angle = 0, target = 0, radius = 0, shown = -1;
    let autoAt = 0;
    let drag: { id: number; x: number; from: number; moved: number } | null = null;
    let suppressClick = false;

    const promoteAround = (center: number) => {
      const activeImg = itemImages[center];
      if (activeImg) void prepareImageElement(activeImg, 'high');
      for (const offset of [-1, 1, -2, 2]) {
        const idx = ((center + offset) % count + count) % count;
        const img = itemImages[idx];
        if (img) void prepareImageElement(img, Math.abs(offset) === 1 ? 'high' : 'auto');
      }
    };

    const settle = () => { target = Math.round(target / step) * step; };
    const hold = () => { autoAt = performance.now() + RESUME_MS; controller.invalidate(); };
    api.current = { step: delta => { settle(); target -= delta * step; hold(); } };

    const onDown = (event: PointerEvent) => {
      if (event.button !== 0) return;
      drag = { id: event.pointerId, x: event.clientX, from: target, moved: 0 };
      suppressClick = false;
      stage.setPointerCapture(event.pointerId);
      stage.classList.add('is-dragging');
      hold();
    };
    const onMove = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.id) return;
      const dx = event.clientX - drag.x;
      drag.moved = Math.max(drag.moved, Math.abs(dx));
      target = drag.from + dx * DRAG_GAIN;
      hold();
    };
    const onUp = (event: PointerEvent) => {
      if (!drag || event.pointerId !== drag.id) return;
      suppressClick = drag.moved > 6;
      drag = null;
      stage.classList.remove('is-dragging');
      settle();
      hold();
    };
    const onClick = (event: MouseEvent) => {
      if (suppressClick) { suppressClick = false; return; }
      const item = event.target instanceof Element ? event.target.closest<HTMLElement>('.mm-item3d') : null;
      if (!item) return;
      const index = items.indexOf(item);
      if (index === shown) { onOpen(outfits[index].id); return; }
      // Turn the shortest way round to the clicked look.
      const current = Math.round(-target / step);
      const delta = ((index - current) % count + count + Math.floor(count / 2)) % count - Math.floor(count / 2);
      settle();
      target -= delta * step;
      hold();
    };
    stage.addEventListener('pointerdown', onDown);
    stage.addEventListener('pointermove', onMove);
    stage.addEventListener('pointerup', onUp);
    stage.addEventListener('pointercancel', onUp);
    stage.addEventListener('click', onClick);

    return {
      id: 'collection-carousel',
      element: section,
      layout(frame) {
        const width = items[0]?.offsetWidth || 260;
        // Wide enough that neighbouring looks never overlap, whatever the count.
        radius = Math.round((width / 2) / Math.tan(Math.PI / count) * 1.08);
        items.forEach((item, i) => writeStyle(item, 'transform', `rotateY(${i * step}deg) translateZ(${radius}px)`));
        if (frame.reducedMotion) angle = target;
      },
      update(_, frame) {
        const idle = !drag && frame.now >= autoAt && !frame.reducedMotion;
        if (idle) target -= AUTO_SPEED * frame.deltaTime;
        const gap = target - angle;
        angle = frame.reducedMotion || Math.abs(gap) < 0.01 ? target : angle + gap * (1 - Math.exp(-frame.deltaTime * 6));
        writeStyle(ring, 'transform', `translateZ(${-radius}px) rotateY(${angle.toFixed(3)}deg)`);
        const next = ((Math.round(-angle / step) % count) + count) % count;
        if (next !== shown) {
          if (shown >= 0) items[shown].classList.remove('is-front');
          items[next].classList.add('is-front');
          shown = next;
          promoteAround(next);
          setFront(next);
        }
        return idle || angle !== target || Boolean(drag) || frame.now < autoAt;
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

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      api.current?.step(event.key === 'ArrowLeft' ? -1 : 1);
    } else if (event.key === 'Enter') {
      onOpen(look.id);
    }
  };

  return <section className="mm-sec mm-carousel" ref={ref} aria-labelledby="carousel-title">
    <div className="mm-container">
      <SectionHeading id="carousel-title" eyebrow="Signature Looks" title={<>Spin the <em>Collection</em></>} lead="Drag, swipe or use the arrows. Tap the look in front for its details." />
    </div>
    <div className="mm-stage" role="group" tabIndex={0} onKeyDown={onKeyDown} aria-roledescription="carousel" aria-label="Signature looks. Use the left and right arrow keys to turn, Enter for details.">
      <CarouselRing />
    </div>
    <div className="mm-cctrl">
      <button type="button" aria-label="Previous look" onClick={() => api.current?.step(-1)}>←</button>
      <span aria-hidden="true">{front + 1} / {count}</span>
      <button type="button" aria-label="Next look" onClick={() => api.current?.step(1)}>→</button>
    </div>
    <div className="mm-cinfo" aria-live="polite">
      <div className="mm-cinfo__in" key={look.id}>
        <span className="mm-eyebrow">{occasionText(look)}</span>
        <h3>{look.title}</h3>
        <p>{look.description}</p>
        <div className="mm-btns">
          <button type="button" className="mm-btn mm-btn--outline mm-btn--sm" onClick={() => onOpen(look.id)}>View Details</button>
          <a href={bookingHref(look.id)} className="mm-btn mm-btn--gold mm-btn--sm">Book This Look</a>
        </div>
      </div>
    </div>
  </section>;
}
