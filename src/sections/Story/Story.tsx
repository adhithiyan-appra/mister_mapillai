import { useRef } from 'react';
import { SourceImage } from '../../components/common/SourceImage';
import { useSceneAnimation } from '../../components/animations/AnimationProvider';
import { element, scrollSmoothing, writeStyle } from '../../utils/animation';
import { prepareImageGroup } from '../../utils/imageLoading';

export function Story() {
  const ref = useRef<HTMLElement>(null);
  useSceneAnimation(ref, story => {
    const image = element(story, '#storyImg');
    let top = 0, height = 0;
    let currentT = -1;
    return {
      id: 'story', element: story, scrollDriven: true,
      ready: prepareImageGroup(story, 'low'),
      enter: () => writeStyle(image, 'willChange', 'transform'),
      leave: () => writeStyle(image, 'willChange', 'auto'),
      layout(frame) { top = story.getBoundingClientRect().top + frame.scrollY; height = story.offsetHeight; },
      update(_, frame) {
        const targetT = 1 - (top + height - frame.scrollY) / (frame.height + height);
        if (currentT < 0 || frame.reducedMotion) {
          currentT = targetT;
        } else {
          currentT += (targetT - currentT) * scrollSmoothing(frame.deltaTime);
          if (Math.abs(targetT - currentT) < 0.0002) currentT = targetT;
        }
        writeStyle(image, 'transform', frame.reducedMotion ? '' : `scale(${1.18 - currentT * 0.18}) translateY(${(currentT - 0.5) * -4}%)`);
        return currentT !== targetT;
      },
    };
  });
  return <section className="story" id="story" aria-label="A groom story" ref={ref}>
    <SourceImage id="storyImg" asset="gowtham" alt="Mr. Gowtham in his bespoke embroidered Mister Mapillai shirt" />
    <blockquote><p>Mr. Gowtham’s shirt began as a moodboard called Royal Procession and became an heirloom.</p><cite className="label">A groom story by Mister Mapillai</cite></blockquote>
  </section>;
}
