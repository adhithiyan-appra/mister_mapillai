import { useRef } from 'react';
import type { CSSProperties } from 'react';
import { images } from '../../data/images';
import { Button } from '../../components/common/Button';
import { GoldParticles } from '../../components/animations/GoldParticles';
import { useSceneAnimation } from '../../components/animations/AnimationProvider';
import { clamp, element, elements, writeStyle } from '../../utils/animation';
import { journeyChapters } from './journeyData';
import { prepareImageGroup } from '../../utils/imageLoading';

export function GroomJourney() {
  const ref = useRef<HTMLElement>(null);
  useSceneAnimation(ref, journey => {
    const chapters = elements(journey, '.ch');
    const layers = chapters.map(chapter => element(chapter, '.jl'));
    const objects = chapters.map(chapter => elements(chapter, '.jo'));
    const bubbles = chapters.map(chapter => elements(chapter, '.bub'));
    const tapes = chapters.map(chapter => chapter.querySelector<SVGElement>('.tapeo'));
    const captions = elements(journey, '.cap');
    const progress = elements(journey, '.jprog li');
    const bars = progress.map(item => element(item, 'i'));
    const hint = element(journey, '#jhint');
    const count = journeyChapters.length;
    const visibleChapters = chapters.map(() => false);
    const objectAt = journeyChapters.map(chapter => chapter.objects.map(object => object.at ?? -1));
    const bubbleAt = bubbles.map(chapter => chapter.map(bubble => Number(bubble.dataset.at)));
    const hiddenObjects = journeyChapters.map(chapter => chapter.objects.map(() => false));
    const hiddenBubbles = bubbles.map(chapter => chapter.map(() => false));
    let active = -1;
    return {
      id: 'journey', element: journey,
      leave: () => chapters.forEach(chapter => writeStyle(chapter, 'willChange', 'auto')),
      layout(frame) {
        const mobile = frame.width < 900;
        const scale = mobile ? Math.min(frame.width / 700, frame.height / 1150) : Math.min(1.05, frame.width / 1500, frame.height / 880);
        layers.forEach(layer => { layer.style.transform = `scale(${scale})`; });
        journeyChapters.forEach((chapter, i) => chapter.objects.forEach((object, j) => {
          objects[i][j].style.transform = `translate(-50%,-50%) translate3d(${object.x * (mobile ? 0.66 : 1)}px,${object.y}px,${object.z}px) ${object.rotation ?? ''}`;
        }));
      },
      update(p, frame) {
        const f = p * (count - 1 + 0.62) - 0.32;
        journeyChapters.forEach((_, i) => {
          const q = f - i, node = chapters[i];
          const opacity = i === count - 1 ? clamp((q + 1) / 0.55) : q < 0 ? clamp((q + 1) / 0.55) : clamp(1 - (q - 0.32) / 0.42);
          writeStyle(node, 'opacity', String(opacity));
          const visible = opacity >= 0.01;
          if (visible !== visibleChapters[i]) {
            visibleChapters[i] = visible;
            writeStyle(node, 'visibility', visible ? 'visible' : 'hidden');
            writeStyle(node, 'willChange', visible ? 'transform, opacity' : 'auto');
          }
          if (opacity < 0.01) return;
          const qz = i === count - 1 ? Math.min(q, 0) : q;
          writeStyle(node, 'transform', frame.reducedMotion ? '' : `translateZ(${qz * 950}px) rotateY(${qz * -7}deg) rotateX(${qz * 2}deg)`);
          objects[i].forEach((object, j) => {
            const hide = q < objectAt[i][j];
            if (hide !== hiddenObjects[i][j]) {
              hiddenObjects[i][j] = hide;
              object.classList.toggle('hide', hide);
            }
          });
          bubbles[i].forEach((bubble, j) => {
            const hide = q < bubbleAt[i][j];
            if (hide !== hiddenBubbles[i][j]) {
              hiddenBubbles[i][j] = hide;
              bubble.classList.toggle('hide', hide);
            }
          });
          const tape = tapes[i];
          if (tape) writeStyle(tape, 'transform', `scaleX(${clamp((q + 0.45) / 0.6)})`);
        });
        const next = clamp(Math.round(f), 0, count - 1);
        if (next !== active) {
          active = next;
          // Hidden 3D chapters are loaded and decoded ahead of their original reveal.
          prepareImageGroup(chapters[next], 'high');
          for (let ahead = 1; ahead <= 2; ahead++) {
            if (chapters[next + ahead]) prepareImageGroup(chapters[next + ahead], 'auto');
          }
          captions.forEach((caption, i) => {
            caption.classList.toggle('on', i === active);
            caption.inert = i !== active;
            caption.setAttribute('aria-hidden', String(i !== active));
            progress[i].classList.toggle('on', i === active);
            if (i === active) progress[i].setAttribute('aria-current', 'step');
            else progress[i].removeAttribute('aria-current');
          });
        }
        bars.forEach((bar, i) => writeStyle(bar, 'transform', `scaleX(${clamp(f - i + 0.5)})`));
        writeStyle(hint, 'opacity', String(1 - clamp((f + 0.32) / 0.25)));
      },
    };
  });
  return <section className="journey scene" id="journey" data-scene="journey" ref={ref} style={{ '--jn': journeyChapters.length + 1 } as CSSProperties} aria-label="How Mister Mapillai dresses a groom, step by step">
    <div className="jstage" id="jstage">
      <div id="chapters">
        {journeyChapters.map(chapter => <div className="ch" key={chapter.key} aria-hidden="true">
          {chapter.background ? <div className={`bg${chapter.soft ? ' soft' : ''}${chapter.clear ? ' clear' : ''}`} data-image-background={images[chapter.background]} style={chapter.key === 'Connect' ? { backgroundImage: `url(${images[chapter.background]})` } : undefined} /> : null}
          <div className="jl">{chapter.objects.map((object, i) => <div className={`jo${object.className ? ` ${object.className}` : ''}`} data-at={object.at ?? -1} key={i}>{object.content}</div>)}</div>
        </div>)}
      </div>
      <div className="jveil" />
      <GoldParticles />
      <div id="sealStart" />
      <div className="jcaps" id="jcaps">
        {journeyChapters.map((chapter, i) => <div className={`cap${i === 0 ? ' on' : ''}`} key={chapter.key}>
          {chapter.end ? <span className="label">Mister Mapillai</span> : <div className="num gold-text">{i + 1}</div>}
          <h2>{chapter.title}</h2><p>{chapter.description}</p>
          {chapter.end ? <div className="acts"><Button href="#consult">Book a fitting consultation</Button><Button variant="line" href="#ceremonies">Explore the ceremonies</Button></div> : null}
        </div>)}
      </div>
      <ol className="jprog" id="jprog" aria-label="Journey chapters">{journeyChapters.map(chapter => <li key={chapter.key}><i />{chapter.key}</li>)}</ol>
      <div className="jhint" id="jhint">Scroll to follow a groom’s journey</div>
    </div>
  </section>;
}
