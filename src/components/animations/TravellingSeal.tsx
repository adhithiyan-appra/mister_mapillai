import { useRef } from 'react';
import sealArtwork from '../../assets/logo/seal.svg?raw';
import { journeyChapters } from '../../sections/GroomJourney/journeyData';
import { clamp, ease, element, writeStyle, writeVariable } from '../../utils/animation';
import { useSceneAnimation } from './AnimationProvider';

export function TravellingSeal() {
  const ref = useRef<HTMLDivElement>(null);
  useSceneAnimation(ref, (seal, controller) => {
    const spin = element(seal, '.spin');
    const start = element(document, '#sealStart');
    const dock = element(document, '#sealDock');
    const journey = element(document, '#journey');
    const about = element(document, '#about');
    const pin = element(document, '#aboutPin');
    const captions = element(document, '#jcaps');
    const stage = element(document, '#jstage');
    let a: DOMRect, b: DOMRect;
    let startTop = 0, dockTop = 0, journeyTop = 0, journeyHeight = 0, stageHeight = 0;
    let aboutStart = 0, aboutHeight = 0, pinHeight = 0;
    let aboutTop = 0, journeyEnd = 0;
    return {
      id: 'travelling-seal',
      active: frame => frame.scrollY <= aboutStart + aboutHeight && (controller.progress('journey') * (journeyChapters.length - 1 + 0.62) - 0.32 >= journeyChapters.length - 1 - 0.55 || frame.scrollY >= journeyEnd),
      layout(frame) {
        const journeyRect = journey.getBoundingClientRect(), aboutRect = about.getBoundingClientRect();
        if (journey.style.contentVisibility !== 'hidden') {
          const stageRect = stage.getBoundingClientRect();
          a = start.getBoundingClientRect(); startTop = a.top - stageRect.top; stageHeight = stageRect.height;
        }
        if (about.style.contentVisibility !== 'hidden') {
          const pinRect = pin.getBoundingClientRect();
          b = dock.getBoundingClientRect(); dockTop = b.top - pinRect.top; pinHeight = pinRect.height;
        }
        journeyTop = journeyRect.top + frame.scrollY; journeyHeight = journeyRect.height;
        aboutStart = aboutRect.top + frame.scrollY; aboutHeight = aboutRect.height;
        aboutTop = about.offsetTop;
        journeyEnd = journey.offsetTop + journey.offsetHeight - frame.height;
        writeStyle(seal, 'width', `${a.width}px`);
        writeStyle(seal, 'height', `${a.width}px`);
      },
      enter: () => writeStyle(seal, 'willChange', 'transform, opacity'),
      leave() {
        writeStyle(seal, 'opacity', '0');
        writeStyle(seal, 'visibility', 'hidden');
        writeStyle(seal, 'willChange', 'auto');
        writeStyle(captions, 'opacity', '1');
        writeVariable(pin, '--c', '0.000');
      },
      update(_, frame) {
        const f = controller.progress('journey') * (journeyChapters.length - 1 + 0.62) - 0.32;
        const sealVisibility = clamp((f - (journeyChapters.length - 1) + 0.55) / 0.45);
        const t = clamp((frame.scrollY - journeyEnd) / (aboutTop + frame.height * 0.22 - journeyEnd));
        const e = ease(t), vis = t > 0 ? 1 : sealVisibility;
        writeStyle(seal, 'opacity', String(vis));
        writeStyle(seal, 'visibility', vis < 0.01 ? 'hidden' : 'visible');
        const x = a.left + (b.left - a.left) * e;
        const stageY = Math.max(journeyTop - frame.scrollY, Math.min(0, journeyTop + journeyHeight - stageHeight - frame.scrollY));
        const pinY = Math.max(aboutStart - frame.scrollY, Math.min(0, aboutStart + aboutHeight - pinHeight - frame.scrollY));
        const startY = stageY + startTop, dockY = pinY + dockTop;
        const y = startY + (dockY - startY) * e;
        const width = a.width + (b.width - a.width) * e;
        const scale = width / Math.max(1, a.width);
        writeStyle(seal, 'transform', `translate3d(${x}px,${y}px,0) scale(${scale})`);
        const arc = Math.sin(Math.PI * t), intro = (1 - sealVisibility) * -80;
        writeStyle(spin, 'transform', frame.reducedMotion ? '' : `perspective(1000px) rotateY(${t > 0 ? e * 360 : intro}deg) rotateX(${arc * 18}deg) rotateZ(${-arc * 8}deg) scale(${t > 0 ? 1 : 0.7 + 0.3 * sealVisibility})`);
        writeStyle(captions, 'opacity', String(1 - clamp(t / 0.25)));
        writeVariable(pin, '--c', clamp((frame.scrollY - aboutTop - frame.height * 0.18) / (frame.height * 0.32)).toFixed(3));
      },
    };
  });
  // Trusted, byte-preserved SVG from the source file; never user-generated markup.
  return <div id="seal" ref={ref} aria-hidden="true"><div className="spin" dangerouslySetInnerHTML={{ __html: sealArtwork }} /></div>;
}
