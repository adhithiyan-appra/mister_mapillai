import { useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { ceremonyTransformations } from '../../data/ceremonies';
import { Button } from '../../components/common/Button';
import { useSceneAnimation } from '../../components/animations/AnimationProvider';
import { clamp, element, elements, writeStyle, writeVariable } from '../../utils/animation';
import { prepareImageGroup } from '../../utils/imageLoading';
import { scrollToDetail } from '../../utils/scrollToDetail';
import { createCorridorGpu } from './corridorGpu';
import { CeremonyComparison } from './CeremonyComparison';

const FADE_ZONE = 0.16;
/** Scroll held at each end of the reveal (fraction of a ceremony's segment):
 * Before rests fully visible after the fade-in, After before the fade-out. */
const REVEAL_HOLD = 0.05;

const smooth = (value: number, from: number, to: number) => {
  const t = clamp((value - from) / (to - from));
  return t * t * (3 - 2 * t);
};

export function CeremonyCorridor() {
  const ref = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);

  useSceneAnimation(ref, (section, controller) => {
    const world = element(section, '#world');
    const floor = element(world, '.floor');
    const walls = elements(world, '.wall');
    const frames = elements(world, '.frame');
    const arches = elements(world, '.frame .arch');
    const comparisons = frames.map(frame => element(frame, '.ceremony-compare'));
    const panel = element(section, '#cnow');
    const indicators = elements(section, '.cprog li');
    const canvas = element<HTMLCanvasElement>(section, '.corridor-gpu');
    const viewport = element(section, '.sticky');
    const gpu = createCorridorGpu(canvas, controller.invalidate);
    const count = ceremonyTransformations.length;
    let distance = 1500;
    let current = -1;
    let wasAccelerated = false;

    const placeActiveFrame = (activeIndex: number, opacity: number, offsetY: number, scale: number, reducedMotion: boolean) => {
      frames.forEach((node, i) => {
        if (i !== activeIndex) {
          writeStyle(node, 'opacity', '0');
          writeStyle(node, 'visibility', 'hidden');
          writeStyle(node, 'pointerEvents', 'none');
          writeStyle(node, 'transform', 'translate(-50%,-50%) translate3d(0,18px,0) scale(0.97)');
          return;
        }
        const transform = reducedMotion
          ? 'translate(-50%,-50%)'
          : `translate(-50%,-50%) translate3d(0,${offsetY.toFixed(2)}px,0) scale(${scale.toFixed(4)})`;
        writeStyle(node, 'transform', transform);
        writeStyle(node, 'opacity', opacity.toFixed(3));
        writeStyle(node, 'visibility', opacity < 0.01 ? 'hidden' : 'visible');
        writeStyle(node, 'pointerEvents', opacity > 0.25 ? 'auto' : 'none');
      });

      const cardTransform = reducedMotion
        ? 'none'
        : `translate3d(0,${(offsetY * 0.55).toFixed(2)}px,0)`;
      writeStyle(panel, 'opacity', opacity.toFixed(3));
      writeStyle(panel, 'transform', cardTransform);
    };

    return {
      id: 'ceremonies',
      element: section,
      ready: prepareImageGroup(frames[0] ?? section, 'high'),
      enter: () => arches.forEach(arch => writeStyle(arch, 'willChange', 'transform')),
      layout(frame) {
        const mobile = frame.width < 768;
        const tablet = frame.width >= 768 && frame.width < 1024;
        distance = mobile ? 1100 : 1500;
        const wallX = mobile ? frame.width * 0.8 : Math.min(frame.width * 0.5, 820);
        const frameWidth = mobile
          ? Math.min(frame.width * 0.58, 236, Math.max(136, (frame.height - 410) * 0.66))
          : tablet
            ? Math.min(frame.width * 0.34, 320, (frame.height - 150) * 0.62)
            : Math.min(frame.width * 0.28, 400, (frame.height - 150) * 0.64);
        section.style.setProperty('--fw', `${Math.round(frameWidth)}px`);
        const depth = (frames.length + 3) * distance + 2000;
        const height = frame.height * 1.3;
        const bounds = viewport.getBoundingClientRect();
        gpu.layout(bounds.width, bounds.height, wallX, depth, height, frame.height * 0.5, mobile);
        floor.style.cssText = `width:${wallX * 2}px;height:${depth}px;transform-origin:0 0;transform:translate3d(${-wallX}px,${frame.height * 0.5}px,1200px) rotateX(-90deg)`;
        walls.forEach((wall, i) => {
          wall.style.cssText = `width:${depth}px;height:${height}px;transform-origin:0 0;transform:translate3d(${i ? wallX : -wallX}px,${-height / 2}px,1200px) rotateY(90deg)`;
        });
        placeActiveFrame(Math.max(0, current), 1, 0, 1, frame.reducedMotion);
      },
      update(p, frame) {
        const clamped = clamp(p);
        const camera = clamped * (count - 1) * distance;
        const accelerated = gpu.draw(camera);
        if (wasAccelerated !== accelerated) {
          wasAccelerated = accelerated;
          section.toggleAttribute('data-gpu-corridor', accelerated);
        }

        const scaled = clamped * count;
        const next = Math.min(count - 1, Math.max(0, Math.floor(scaled)));
        const segT = clamp(scaled - next);

        let opacity = 1;
        let offsetY = 0;
        let scale = 1;
        if (!frame.reducedMotion) {
          if (next > 0 && segT < FADE_ZONE) {
            const eIn = smooth(segT, 0, FADE_ZONE);
            opacity = eIn;
            offsetY = (1 - eIn) * 18;
            scale = 0.97 + 0.03 * eIn;
          } else if (next < count - 1 && segT > 1 - FADE_ZONE) {
            const eOut = smooth(segT, 1 - FADE_ZONE, 1);
            opacity = 1 - eOut;
            offsetY = -eOut * 18;
            scale = 1 - 0.03 * eOut;
          }
        }

        placeActiveFrame(next, opacity, offsetY, scale, frame.reducedMotion);

        // Before → After reveal: the single source of truth is this ceremony's
        // scroll segment. Between its fade-in and fade-out the divider travels
        // linearly from the left edge (Before only) to the right edge (After
        // only), so scrolling up reverses it exactly. Reduced motion shows a
        // static half-and-half comparison instead.
        const revealFrom = (next > 0 ? FADE_ZONE : 0) + REVEAL_HOLD;
        const revealTo = (next < count - 1 ? 1 - FADE_ZONE : 1) - REVEAL_HOLD;
        const reveal = frame.reducedMotion ? 0.5 : clamp((segT - revealFrom) / (revealTo - revealFrom));
        if (comparisons[next]) writeVariable(comparisons[next], '--comparison-progress', reveal.toFixed(4));

        if (next === current) return;
        current = next;
        if (frames[next]) void prepareImageGroup(frames[next], 'high');
        if (frames[next + 1]) void prepareImageGroup(frames[next + 1], 'high');
        if (next > 0 && frames[next - 1]) void prepareImageGroup(frames[next - 1], 'auto');
        setActive(next);
        indicators.forEach((indicator, i) => {
          indicator.classList.toggle('on', i <= next);
          indicator.classList.toggle('current', i === next);
        });
      },
      leave() {
        arches.forEach(arch => writeStyle(arch, 'willChange', 'auto'));
        gpu.suspend();
      },
      dispose() {
        gpu.dispose();
      },
    };
  });

  const ceremony = ceremonyTransformations[active] ?? ceremonyTransformations[0];
  const count = ceremonyTransformations.length;

  return <section
    className="scene corr"
    id="ceremonies"
    data-scene="corr"
    data-active-ceremony={ceremony.id}
    style={{ '--cn': count } as CSSProperties}
    ref={ref}
  >
    <div className="sticky">
      <canvas className="corridor-gpu" aria-hidden="true" />
      <div className="fog" />
      <div className="corr-layout">
        <div className="world" id="world">
          <div className="floor" />
          <div className="wall" />
          <div className="wall" />
          {ceremonyTransformations.map((item, index) => (
            <div
              className={`frame${index === active ? ' is-active' : ''}`}
              key={item.id}
              data-ceremony-id={item.id}
              data-active={index === active ? 'true' : 'false'}
            >
              <div className="arch">
                <CeremonyComparison
                  id={item.id}
                  category={item.category}
                  title={item.title}
                  beforeImage={item.beforeImage}
                  afterImage={item.afterImage}
                  beforeDescription={item.details[0]?.before ?? 'Everyday attire'}
                  afterDescription={item.details[0]?.after ?? item.description}
                  active={index === active}
                  sizes="(max-width: 767px) min(62vw, 240px), (max-width: 1023px) min(36vw, 320px), min(28vw, 400px)"
                />
              </div>
            </div>
          ))}
          <div className="corr-drag-hint" aria-hidden="true">
            <span>Before</span>
            <i>→</i>
            <span>With Mister Mapillai</span>
          </div>
        </div>

        <div className="cpanel">
          <div className="corr-head">
            <span className="label">Walk through the wedding</span>
            <h2>A look for every ceremony</h2>
          </div>

          <div
            className="cnow"
            id="cnow"
            data-ceremony-id={ceremony.id}
            aria-live="polite"
            aria-atomic="true"
          >
            {/* Every ceremony's card content shares one grid cell and only the
                active one is shown, so the card keeps the height of its longest
                ceremony: the heading, card, button and ceremony nav never move
                as the ceremonies change. IDs go to the active content only. */}
            {ceremonyTransformations.map((item, i) => {
              const current = i === active;
              const id = (name: string) => (current ? name : undefined);
              return <div className={`cnow-item${current ? ' is-current' : ''}`} key={item.id} data-ceremony-id={item.id} aria-hidden={!current} inert={!current || undefined}>
                <div className="corr-meta">
                  <span className="label corr-cat" id={id('cCat')}>{item.category}</span>
                  <span className="corr-step">
                    <span className="num gold-text" id={id('cNum')}>{String(i + 1).padStart(2, '0')}</span>
                    <span className="corr-total">/ {String(count).padStart(2, '0')}</span>
                  </span>
                </div>

                <div className="corr-titles">
                  <h3 id={id('cTitle')}>{item.title}</h3>
                  <div className="sub" id={id('cSub')}>{item.subtitle}</div>
                </div>

                <p className="corr-desc" id={id('cDesc')}>{item.description}</p>

                <div className="corr-table-wrap" role="region" aria-label={`${item.title} before and after styling details`}>
                  <div className="corr-table-head" aria-hidden="true">
                    <span>Detail</span>
                    <span>Before</span>
                    <span>With Mister Mapillai</span>
                  </div>
                  <ul id={id('cList')}>
                    {item.details.map(detail => (
                      <li key={detail.label} data-detail={detail.label}>
                        <b>{detail.label}</b>
                        <span className="corr-before">{detail.before}</span>
                        <span className="corr-after">{detail.after}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="corr-cta-row">
                  <Button
                    href="/contact"
                    id={id('cCta')}
                  >
                    Book this look
                  </Button>
                </div>
              </div>;
            })}
          </div>

          <ol className="cprog" id="hud" aria-label="Ceremony transformations">
            {ceremonyTransformations.map((item, i) => (
              <li
                key={item.id}
                className={i <= active ? `on${i === active ? ' current' : ''}` : undefined}
              >
                <button
                  type="button"
                  className="cprog-btn"
                  aria-label={`Step ${i + 1}: ${item.category} (${item.title})`}
                  aria-current={i === active ? 'step' : undefined}
                  onClick={() => scrollToDetail(ref.current, (i + 0.45) / count)}
                >
                  <span>{item.category}</span>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  </section>;
}
