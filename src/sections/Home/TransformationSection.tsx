import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent as ReactPointerEvent, Ref } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SectionHeading } from '../../components/common/SectionHeading';
import { SourceImage } from '../../components/common/SourceImage';
import { ceremonyTransformations } from '../../data/ceremonies';
import { imageSource } from '../../data/imageSources';
import { onHeroReady } from '../../utils/heroReady';
import { comparisonPanels } from '../../data/showcase';

gsap.registerPlugin(ScrollTrigger);

const clamp = (value: number) => Math.min(100, Math.max(0, value));

function decodePair(index: number) {
  const item = ceremonyTransformations[index];
  return Promise.all([imageSource(item.beforeImage).src, imageSource(item.afterImage).src].map(source => {
    const image = new Image();
    image.decoding = 'async';
    image.src = source;
    return image.decode().catch(() => undefined);
  }));
}

/** Cinematic before/after comparison: scroll-scrubbed, with manual drag priority. */
export function TransformationSection() {
  const [active, setActive] = useState(0);
  const [pair, setPair] = useState<{ current: number; previous: number | null }>({ current: 0, previous: null });
  const stageRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<HTMLDivElement>(null);
  const beforeTagRef = useRef<HTMLSpanElement>(null);
  const afterTagRef = useRef<HTMLSpanElement>(null);
  const currentPairRef = useRef<HTMLDivElement>(null);
  const outgoingPairRef = useRef<HTMLDivElement>(null);

  const positionRef = useRef(0);
  const pendingRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const manualRef = useRef(false);
  const scrollProgressRef = useRef(0);
  const scrollActiveRef = useRef(false);
  const syncTweenRef = useRef<gsap.core.Tween | null>(null);
  const loadedRef = useRef(new Set<number>([0]));
  const requestRef = useRef(0);

  const paint = useCallback((value: number) => {
    const node = frameRef.current;
    if (!node) return;
    const next = clamp(value);
    positionRef.current = next;
    node.style.setProperty('--p', `${next}%`);
    const handle = handleRef.current;
    if (handle) {
      handle.setAttribute('aria-valuenow', String(Math.round(next)));
      handle.setAttribute('aria-valuetext', `${Math.round(100 - next)}% before, ${Math.round(next)}% with Mister Mapillai`);
    }
    if (afterTagRef.current) afterTagRef.current.style.opacity = next < 14 ? '0' : '1';
    if (beforeTagRef.current) beforeTagRef.current.style.opacity = next > 86 ? '0' : '1';
  }, []);

  const paintOnFrame = useCallback((value: number) => {
    const next = clamp(value);
    positionRef.current = next;
    pendingRef.current = next;
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      if (pendingRef.current !== null) {
        paint(pendingRef.current);
        pendingRef.current = null;
      }
    });
  }, [paint]);

  const syncToScroll = useCallback(() => {
    if (!scrollActiveRef.current) return;
    syncTweenRef.current?.kill();
    const proxy = { value: positionRef.current };
    syncTweenRef.current = gsap.to(proxy, {
      value: scrollProgressRef.current * 100,
      duration: 0.45,
      ease: 'power2.out',
      onUpdate: () => paint(proxy.value),
      onComplete: () => { syncTweenRef.current = null; },
    });
  }, [paint]);

  useEffect(() => {
    paint(0);
    // On a first home visit these twelve images wait for the hero's opening frames.
    let timers: number[] = [];
    const stopWaiting = onHeroReady(() => {
      timers = ceremonyTransformations.map((_, index) => window.setTimeout(() => {
        void decodePair(index).then(() => loadedRef.current.add(index));
      }, index === 0 ? 0 : 350 * index));
    });

    const media = gsap.matchMedia();
    const build = (start: string, end: string) => {
      const proxy = { value: 0 };
      const tween = gsap.to(proxy, {
        value: 100,
        ease: 'none',
        onUpdate: () => {
          if (manualRef.current || syncTweenRef.current?.isActive()) return;
          paint(proxy.value);
        },
        scrollTrigger: {
          trigger: stageRef.current,
          start,
          end,
          pin: true,
          pinSpacing: true,
          scrub: 0.65,
          invalidateOnRefresh: true,
          onToggle: self => { scrollActiveRef.current = self.isActive; },
          onUpdate: self => {
            scrollProgressRef.current = self.progress;
            if (syncTweenRef.current?.isActive()) {
              syncTweenRef.current.kill();
              syncTweenRef.current = null;
            }
          },
        },
      });
      return () => {
        scrollActiveRef.current = false;
        tween.scrollTrigger?.kill();
        tween.kill();
      };
    };
    media.add('(prefers-reduced-motion: no-preference) and (min-width: 641px)', () => build('top 90px', '+=140%'));
    media.add('(prefers-reduced-motion: no-preference) and (max-width: 640px)', () => build('top 72px', '+=80%'));

    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener('load', refresh);
    const refreshTimer = window.setTimeout(refresh, 300);

    return () => {
      window.removeEventListener('load', refresh);
      window.clearTimeout(refreshTimer);
      stopWaiting();
      timers.forEach(window.clearTimeout);
      media.revert();
      syncTweenRef.current?.kill();
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [paint]);

  useLayoutEffect(() => {
    const incoming = currentPairRef.current;
    const outgoing = outgoingPairRef.current;
    if (!incoming || !outgoing) return;
    const timeline = gsap.timeline({
      onComplete: () => setPair(current => ({ current: current.current, previous: null })),
    });
    timeline.fromTo(incoming, { opacity: 0 }, { opacity: 1, duration: 0.55, ease: 'power2.out' }, 0)
      .to(outgoing, { opacity: 0, duration: 0.55, ease: 'power2.inOut' }, 0);
    return () => { timeline.kill(); };
  }, [pair.current, pair.previous]);

  const select = (index: number) => {
    if (index === active) return;
    const token = ++requestRef.current;
    setActive(index);
    void (async () => {
      if (!loadedRef.current.has(index)) {
        await decodePair(index);
        loadedRef.current.add(index);
      }
      if (requestRef.current !== token) return;
      syncTweenRef.current?.kill();
      syncTweenRef.current = null;
      paint(0);
      setPair(current => ({ current: index, previous: current.current }));
    })();
  };

  const fromPointer = (clientX: number) => {
    const rect = frameRef.current?.getBoundingClientRect();
    if (rect) paintOnFrame(clamp(((clientX - rect.left) / rect.width) * 100));
  };
  const onDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    manualRef.current = true;
    syncTweenRef.current?.kill();
    syncTweenRef.current = null;
    event.currentTarget.setPointerCapture(event.pointerId);
    fromPointer(event.clientX);
  };
  const onUp = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!manualRef.current) return;
    manualRef.current = false;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    syncToScroll();
  };
  const onMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!manualRef.current) return;
    if (event.pointerType === 'mouse' && event.buttons === 0) {
      onUp(event);
      return;
    }
    fromPointer(event.clientX);
  };
  const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 20 : 5;
    const next = { ArrowLeft: positionRef.current - step, ArrowRight: positionRef.current + step, Home: 0, End: 100 }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    manualRef.current = true;
    paint(clamp(next));
    manualRef.current = false;
  };

  const renderPair = (index: number, ref?: Ref<HTMLDivElement>) => {
    const look = ceremonyTransformations[index];
    return <div className="mm-ba__pair" ref={ref}>
      <div className="mm-ba__layer mm-ba__layer--after">
        <SourceImage asset={look.afterImage} alt={`${look.title} with Mister Mapillai`} draggable={false} />
      </div>
      <div className="mm-ba__layer mm-ba__layer--before">
        <SourceImage asset={look.beforeImage} alt={`${look.title} before`} draggable={false} />
      </div>
    </div>;
  };

  return <section className="mm-sec mm-sec--white mm-ba-sec" aria-labelledby="ba-title">
    <div className="mm-container">
      <SectionHeading
        id="ba-title"
        eyebrow="The Difference"
        title={<>With &amp; Without <em>Mister Mapillai</em></>}
        lead="Drag the slider to see the transformation."
      />
      <div className="mm-ba-stage" ref={stageRef}>
        <div className="mm-ba-tabs" role="group" aria-label="Choose a ceremony">
          {ceremonyTransformations.map((ceremony, index) => <button type="button" className="mm-tab" key={ceremony.id} aria-pressed={index === active} onClick={() => select(index)}>{ceremony.title}</button>)}
        </div>
        <div className="mm-ba-wrap" role="group" aria-label="With and Without Mister Mapillai comparison">
          <div className="mm-ba-panel mm-ba-panel--before mm-reveal mm-reveal--left">
            <h4>{comparisonPanels.usual.title}</h4>
            <ul className="mm-ba-bullets">
              {comparisonPanels.usual.points.map(point => <li key={point}>{point}</li>)}
            </ul>
          </div>
          <div
            className="mm-ba"
            ref={frameRef}
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
          >
            {pair.previous !== null ? renderPair(pair.previous, outgoingPairRef) : null}
            {renderPair(pair.current, currentPairRef)}
            <span className="mm-ba__tag mm-ba__tag--after" ref={afterTagRef} aria-hidden="true">With Mister Mapillai</span>
            <span className="mm-ba__tag mm-ba__tag--before" ref={beforeTagRef} aria-hidden="true">Before</span>
            <div
              className="mm-ba__handle"
              ref={handleRef}
              role="slider"
              tabIndex={0}
              aria-label="Before and after divider"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={0}
              aria-valuetext="100% before, 0% with Mister Mapillai"
              onKeyDown={onKey}
            />
          </div>
          <div className="mm-ba-panel mm-ba-panel--after mm-reveal mm-reveal--right">
            <h4>{comparisonPanels.mapillai.title}</h4>
            <ul className="mm-ba-bullets">
              {comparisonPanels.mapillai.points.map(point => <li key={point}>{point}</li>)}
            </ul>
          </div>
        </div>
      </div>
    </div>
  </section>;
}
