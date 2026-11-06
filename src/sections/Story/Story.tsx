import { useRef } from 'react';
import { SourceImage } from '../../components/common/SourceImage';
import { useSceneAnimation } from '../../components/animations/AnimationProvider';
import { element, writeStyle } from '../../utils/animation';

export function Story() {
  const ref = useRef<HTMLElement>(null);
  useSceneAnimation(ref, story => {
    const image = element(story, '#storyImg');
    let top = 0, height = 0;
    return {
      id: 'story', element: story, scrollDriven: true,
      enter: () => writeStyle(image, 'willChange', 'transform'),
      leave: () => writeStyle(image, 'willChange', 'auto'),
      layout(frame) { top = story.getBoundingClientRect().top + frame.scrollY; height = story.offsetHeight; },
      update(_, frame) {
        const t = 1 - (top + height - frame.scrollY) / (frame.height + height);
        writeStyle(image, 'transform', frame.reducedMotion ? '' : `scale(${1.18 - t * 0.18}) translateY(${(t - 0.5) * -4}%)`);
      },
    };
  });
  return <section className="story" id="story" aria-label="A groom story" ref={ref}>
    <SourceImage id="storyImg" asset="gowtham" alt="Mr. Gowtham in his bespoke embroidered Mister Mapillai shirt" />
    <blockquote><p>Mr. Gowtham’s shirt began as a moodboard called Royal Procession and became an heirloom.</p><cite className="label">A groom story by Mister Mapillai</cite></blockquote>
  </section>;
}
