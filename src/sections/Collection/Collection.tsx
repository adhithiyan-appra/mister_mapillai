import { useRef, useState } from 'react';
import { collectionLooks } from '../../data/collection';
import { SourceImage } from '../../components/common/SourceImage';
import { useSceneAnimation } from '../../components/animations/AnimationProvider';
import { element, elements, writeStyle } from '../../utils/animation';
import { prepareImageGroup } from '../../utils/imageLoading';
import { createCollectionGpu } from './collectionGpu';

export function Collection() {
  const ref = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  useSceneAnimation(ref, (section, controller) => {
    const ring = element(section, '#ring');
    const cards = elements(ring, '.look');
    const canvas = element<HTMLCanvasElement>(section, '.collection-gpu');
    const stage = element(section, '.stage');
    const gpu = createCollectionGpu(canvas, elements<HTMLImageElement>(ring, 'img'), controller.invalidate);
    const count = cards.length, step = 360 / count;
    let radius = 0, front = -1;
    let wasAccelerated = false;
    return {
      id: 'collection', element: section,
      ready: prepareImageGroup(section, 'low'),
      layout(frame) {
        const width = Math.round(frame.width < 900 ? Math.min(150, frame.width * 0.38, frame.height * 0.2) : Math.min(210, frame.height * 0.24));
        section.style.setProperty('--cw', `${width}px`);
        radius = Math.round((width / 2) / Math.tan(Math.PI / count)) + width * 0.3;
        const bounds = stage.getBoundingClientRect();
        gpu.layout(bounds.width, bounds.height, width, radius);
        cards.forEach((card, i) => { card.style.transform = `rotateY(${i * step}deg) translateZ(${radius}px)`; });
      },
      update(p) {
        const angle = -p * (count - 1) * step;
        const accelerated = gpu.draw(p);
        if (!accelerated) writeStyle(ring, 'transform', `translateZ(${-radius}px) rotateX(-4deg) rotateY(${angle}deg)`);
        if (wasAccelerated !== accelerated) { wasAccelerated = accelerated; section.toggleAttribute('data-gpu-collection', accelerated); }
        let best = 0, bestZ = -2;
        cards.forEach((card, i) => {
          const z = Math.cos((i * step + angle) * Math.PI / 180);
          if (!accelerated) writeStyle(card, 'filter', `brightness(${0.4 + 0.6 * ((z + 1) / 2)})`);
          if (z > bestZ) { bestZ = z; best = i; }
        });
        if (front !== best) {
          front = best;
          prepareImageGroup(cards[best], 'high');
          prepareImageGroup(cards[(best + 1) % count], 'auto');
          prepareImageGroup(cards[(best - 1 + count) % count], 'auto');
          setActive(best);
        }
      },
      leave: () => gpu.suspend(),
      dispose: () => gpu.dispose(),
    };
  });
  return <section className="scene coll" id="collection" data-scene="coll" ref={ref}>
    <div className="sticky flow">
      <div className="scene-head"><span className="label">The collection</span><h2>Twelve ways to make an entrance</h2></div>
      <div className="stage">
        <canvas className="collection-gpu" aria-hidden="true" />
        <div className="ring" id="ring">{collectionLooks.map(look => <div className="look" key={look.name}><SourceImage asset={look.image} responsive={false} alt={look.name} /></div>)}</div>
        <div className="coll-cap" aria-live="polite" aria-atomic="true"><div className="n" id="collName">{collectionLooks[active].name}</div><div className="d" id="collDesc">{collectionLooks[active].description}</div></div>
      </div>
    </div>
  </section>;
}
