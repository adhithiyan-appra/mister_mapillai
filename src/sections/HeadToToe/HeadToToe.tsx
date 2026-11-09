import { useRef } from 'react';
import { stylingDetails } from '../../data/styling';
import { SourceImage } from '../../components/common/SourceImage';
import { useSceneAnimation } from '../../components/animations/AnimationProvider';
import { clamp, element, elements, writeStyle } from '../../utils/animation';
import { prepareImageGroup } from '../../utils/imageLoading';
import { scrollToDetail } from '../../utils/scrollToDetail';

export function HeadToToe() {
  const ref = useRef<HTMLElement>(null);
  useSceneAnimation(ref, section => {
    const figure = element(section, '#fig');
    const scan = element(section, '#scan');
    const pins = elements<HTMLButtonElement>(figure, '.pin');
    const steps = elements(section, '.steps li');
    const inner = element(figure, '.in');
    let scanHeight = 0, lastRevealed = -2;
    return {
      id: 'headtotoe', element: section,
      ready: prepareImageGroup(section, 'low'),
      layout: () => { if (section.style.contentVisibility !== 'hidden') scanHeight = parseFloat(getComputedStyle(inner).height); },
      enter: () => writeStyle(scan, 'willChange', 'transform'),
      leave: () => writeStyle(scan, 'willChange', 'auto'),
      update(p, frame) {
        const y = clamp((p - 0.05) / 0.85) * 100;
        writeStyle(scan, 'transform', `translate3d(0,${y * scanHeight / 100}px,0)`);
        writeStyle(figure, 'transform', frame.reducedMotion ? '' : `rotateY(${-14 + p * 24}deg) rotateX(${4 - p * 6}deg)`);
        let last = -1;
        stylingDetails.forEach((detail, i) => {
          const on = y / 100 >= detail.y - 0.02;
          if (on) last = i;
        });
        if (last === lastRevealed) return;
        lastRevealed = last;
        steps.forEach((step, i) => {
          const active = i === Math.max(0, last);
          step.classList.toggle('on', active);
          pins[i].classList.toggle('on', i <= last);
          pins[i].tabIndex = i <= last ? 0 : -1;
          pins[i].setAttribute('aria-pressed', String(active));
        });
      },
    };
  });
  return <section className="scene h2t" id="headtotoe" data-scene="h2t" ref={ref}>
    <div className="sticky">
      <div className="copy"><span className="label">Head to toe</span>
        <h2 style={{ marginTop: 12 }}>Nothing left to chance</h2>
        <p className="lede" style={{ marginTop: 16 }}>We design the whole look, not just the outfit. Scroll to see how one ceremonial look is put together.</p>
        <ol className="steps" id="h2tSteps">{stylingDetails.map((detail, i) => <li id={`styling-${i}`} key={detail.key}><b>{detail.key}</b><span>{detail.description}</span></li>)}</ol>
      </div>
      <div className="figure3d"><div className="fig" id="fig"><div className="in">
        <SourceImage asset="ceremonial-shirt" sizes="(max-width: 900px) 37.34svh, min(52svh, 507px)" alt="Groom in an embroidered ceremonial shirt, black trousers, gold-buckle belt and black oxfords" />
        <div className="scan" id="scan" aria-hidden="true" />
        {stylingDetails.map((detail, i) => <button type="button" className="pin" key={detail.key} style={{ left: `${detail.x * 100}%`, top: `${detail.y * 100}%` }} aria-label={`${detail.key}: ${detail.description}`} aria-controls={`styling-${i}`} onClick={() => scrollToDetail(ref.current, 0.05 + 0.85 * detail.y)} />)}
      </div></div></div>
    </div>
  </section>;
}
