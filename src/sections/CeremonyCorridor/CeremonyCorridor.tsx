import { useRef, useState } from 'react';
import { ceremonies } from '../../data/ceremonies';
import { SourceImage } from '../../components/common/SourceImage';
import { Button } from '../../components/common/Button';
import { useSceneAnimation } from '../../components/animations/AnimationProvider';
import { clamp, element, elements, writeStyle } from '../../utils/animation';
import { prepareImageGroup } from '../../utils/imageLoading';
import { createCorridorGpu } from './corridorGpu';

export function CeremonyCorridor() {
  const ref = useRef<HTMLElement>(null);
  const [active, setActive] = useState(0);
  useSceneAnimation(ref, (section, controller) => {
    const world = element(section, '#world');
    const floor = element(world, '.floor');
    const walls = elements(world, '.wall');
    const frames = elements(world, '.frame');
    const arches = elements(world, '.frame .arch');
    const panel = element(section, '#cnow');
    const indicators = elements(section, '.cprog li');
    const canvas = element<HTMLCanvasElement>(section, '.corridor-gpu');
    const viewport = element(section, '.sticky');
    const gpu = createCorridorGpu(canvas, controller.invalidate);
    let distance = 1500, cameraEnd = 0;
    let frameZ: number[] = [];
    let current = -1;
    let wasAccelerated = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    return {
      id: 'ceremonies', element: section,
      enter: () => arches.forEach(arch => writeStyle(arch, 'willChange', 'transform')),
      layout(frame) {
        const mobile = frame.width < 900;
        distance = mobile ? 1100 : 1500;
        const wallX = mobile ? frame.width * 0.8 : Math.min(frame.width * 0.5, 820);
        const frameWidth = mobile ? Math.min(frame.width * 0.56, 300, frame.height * 0.3) : Math.min(frame.width * 0.24, 360, frame.height * 0.42);
        section.style.setProperty('--fw', `${frameWidth}px`);
        const depth = (frames.length + 3) * distance + 2000, height = frame.height * 1.3;
        const bounds = viewport.getBoundingClientRect();
        gpu.layout(bounds.width, bounds.height, wallX, depth, height, frame.height * .5, frame.width <= 900);
        floor.style.cssText = `width:${wallX * 2}px;height:${depth}px;transform-origin:0 0;transform:translate3d(${-wallX}px,${frame.height * 0.5}px,1200px) rotateX(-90deg)`;
        walls.forEach((wall, i) => { wall.style.cssText = `width:${depth}px;height:${height}px;transform-origin:0 0;transform:translate3d(${i ? wallX : -wallX}px,${-height / 2}px,1200px) rotateY(90deg)`; });
        frameZ = frames.map((_, i) => -700 - i * distance);
        frames.forEach((arch, i) => {
          const x = mobile ? 0 : (i % 2 ? 1 : -1) * Math.min(150, frame.width * 0.09);
          writeStyle(arch, 'transform', `translate(-50%,-50%) translate3d(${x}px,0,${frameZ[i]}px)`);
        });
        cameraEnd = (frames.length - 1) * distance + 1300;
      },
      update(p, frame) {
        const camera = p * cameraEnd;
        const accelerated = gpu.draw(camera);
        if (wasAccelerated !== accelerated) { wasAccelerated = accelerated; section.toggleAttribute('data-gpu-corridor', accelerated); }
        writeStyle(world, 'transform', `translateZ(${camera}px)`);
        let next = 0;
        frames.forEach((arch, i) => {
          const rel = frameZ[i] + camera;
          const opacity = clamp(rel > -420 ? 1 - (rel + 420) / 320 : (rel + 4.4 * distance) / (1.3 * distance));
          writeStyle(arch, 'opacity', String(opacity));
          writeStyle(arch, 'visibility', opacity < 0.01 ? 'hidden' : 'visible');
          if (rel > -distance * 0.62 - 700) next = i + 1;
        });
        next = p > 0.93 ? ceremonies.length : Math.max(0, next - 1);
        if (next === current) return;
        const first = current === -1;
        current = next;
        if (frames[next]) prepareImageGroup(frames[next], 'high');
        clearTimeout(timer);
        panel.classList.add('swap');
        const show = () => {
          setActive(next);
          indicators.forEach((indicator, i) => indicator.classList.toggle('on', i <= Math.min(next, ceremonies.length - 1)));
          panel.classList.remove('swap');
        };
        if (first || frame.reducedMotion) show();
        else timer = setTimeout(show, 180);
      },
      leave() {
        arches.forEach(arch => writeStyle(arch, 'willChange', 'auto'));
        gpu.suspend();
      },
      dispose() { clearTimeout(timer); gpu.dispose(); },
    };
  });
  const ceremony = ceremonies[active];
  const end = active >= ceremonies.length;
  return <section className="scene corr" id="ceremonies" data-scene="corr" ref={ref}>
    <div className="sticky">
      <canvas className="corridor-gpu" aria-hidden="true" />
      <div className="world" id="world"><div className="floor" /><div className="wall" /><div className="wall" />
        {ceremonies.map(item => <div className="frame" key={item.title}><div className="arch"><SourceImage asset={item.image} sizes="(max-width: 899px) min(56vw, 300px, 30vh), min(24vw, 360px, 42vh)" alt={`${item.title} look: ${item.details[0][1]}`} /></div></div>)}
      </div>
      <div className="fog" />
      <div className="cpanel">
        <span className="label">Walk through the wedding</span><h2>A look for every ceremony</h2>
        <div className={`cnow${end ? ' end' : ''}`} id="cnow" aria-live="polite" aria-atomic="true">
          <div className="num gold-text" id="cNum">{active + 1}</div>
          <h3 id="cTitle">{end ? 'Every ceremony, one designer' : ceremony.title}</h3>
          <div className="sub" id="cSub">{end ? 'Your wedding' : ceremony.subtitle}</div>
          <ul id="cList">{!end ? ceremony.details.map(([key, value]) => <li key={key}><b>{key}</b><span>{value}</span></li>) : null}</ul>
          <Button href="#consult" id="cCta">{end ? 'Plan my looks' : 'Plan this look'}</Button>
        </div>
        <ol className="cprog" id="hud" aria-hidden="true">{ceremonies.map(item => <li key={item.title} />)}</ol>
      </div>
    </div>
  </section>;
}
