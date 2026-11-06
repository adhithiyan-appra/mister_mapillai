import { useRef } from 'react';
import { embroideryDetails } from '../../data/styling';
import { SourceImage } from '../../components/common/SourceImage';
import { useSceneAnimation } from '../../components/animations/AnimationProvider';
import { clamp, element, elements, writeStyle } from '../../utils/animation';
import { scrollToDetail } from '../../utils/scrollToDetail';

export function Devatan() {
  const ref = useRef<HTMLElement>(null);
  useSceneAnimation(ref, section => {
    const shirt = element(section, '#shirt');
    const hotspots = elements(shirt, '.hot');
    const cards = elements(section, '.dcard');
    let current = -1;
    return {
      id: 'devatan', element: section,
      update(p, frame) {
        const active = Math.min(embroideryDetails.length - 1, Math.floor(clamp((p - 0.04) / 0.9) * embroideryDetails.length));
        writeStyle(shirt, 'transform', frame.reducedMotion ? '' : `rotateY(${18 - p * 36}deg) rotateX(3deg)`);
        if (active === current) return;
        current = active;
        hotspots.forEach((hotspot, i) => {
          hotspot.classList.toggle('on', i === active);
          hotspot.setAttribute('aria-pressed', String(i === active));
          cards[i].classList.toggle('on', i === active);
          cards[i].classList.toggle('past', i < active);
          cards[i].setAttribute('aria-hidden', String(i !== active));
        });
      },
    };
  });
  return <section className="scene dev" id="devatan" data-scene="dev" ref={ref}>
    <div className="sticky">
      <div className="shirt-st"><div className="shirt" id="shirt">
        <SourceImage asset="devatan-shirt" alt="Devatan groom shirt in golden silk with temple and elephant embroidery" />
        {embroideryDetails.map((detail, i) => <button type="button" className="hot" style={{ left: `${detail.x * 100}%`, top: `${detail.y * 100}%` }} key={detail.key} aria-label={`Explore ${detail.key.toLowerCase()}`} aria-controls={`embroidery-${i}`} onClick={() => scrollToDetail(ref.current, 0.04 + 0.9 * ((i + 0.5) / embroideryDetails.length))} />)}
      </div></div>
      <div className="copy"><span className="label">Signature piece</span>
        <h2 style={{ marginTop: 12 }}>Devatan, divine in every detail</h2>
        <p className="lede" style={{ marginTop: 16 }}>Our signature groom shirt: temple gopurams, royal elephants and florals worked by hand on golden pure silk.</p>
        <div className="dcards" id="dcards" aria-live="polite" aria-atomic="true">{embroideryDetails.map((detail, i) => <div className="dcard" key={detail.key} id={`embroidery-${i}`}>
          <SourceImage asset={detail.image} alt={`${detail.key} embroidery close-up`} />
          <div><span className="label">{detail.technique}</span><h3>{detail.key}</h3><p>{detail.description}</p></div>
        </div>)}</div>
      </div>
    </div>
  </section>;
}
