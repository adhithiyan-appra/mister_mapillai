
import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SectionHeading } from '../../components/common/SectionHeading';
import { SourceImage } from '../../components/common/SourceImage';
import { CountUp } from '../../components/common/CountUp';
import { brandIntro, brandReasons, brandRole } from '../../data/brand';
import { ceremonies } from '../../data/ceremonies';
import type { ImageKey } from '../../data/images';
import { cssVars } from '../../utils/style';

gsap.registerPlugin(ScrollTrigger);

interface CraftStep {
  number: number;
  label: string;
  title: string;
  description: string;
  alt: string;
  objectPosition?: string;
  externalSrc?: string;
  asset?: ImageKey;
}

const REFERENCE_STEP_ONE_IMAGE = 'https://images.unsplash.com/photo-1606800052052-a08af7148866?w=900&q=70&auto=format&fit=crop';

const craftSteps: readonly CraftStep[] = [
  {
    number: 1,
    label: 'Step One',
    title: 'Listen & Sketch',
    description: 'We learn about your events, family traditions and theme, then sketch looks for each ritual with a colour story that flows from Muhurtham to reception.',
    externalSrc: REFERENCE_STEP_ONE_IMAGE,
    alt: 'South Indian bride and groom smiling together before wedding rituals',
    objectPosition: 'center 25%',
  },
  {
    number: 2,
    label: 'Step Two',
    title: 'Source the Finest Fabric',
    description: 'Kanchipuram and Banarasi silks, real zari, and fine suiting — hand-picked for your skin tone, the season and the venue.',
    asset: 'chair_coat',
    alt: 'Golden pure silk groom shirt paired with a gold-border pattu veshti',
    objectPosition: 'center 14%',
  },
  {
    number: 3,
    label: 'Step Three',
    title: 'Measure, Cut & Embroider',
    description: '30+ measurement points, a custom pattern for your body, and hand embroidery by artisans who have done this for generations.',
    asset: 'sherwani-wide',
    alt: 'Bespoke champagne gold sherwani with hand embroidery along collar and shoulders',
    objectPosition: 'center 12%',
  },
  {
    number: 4,
    label: 'Step Four',
    title: 'Fit, Finish & Style',
    description: 'Two trial fittings, final finishing and a quality check — then we style you head to toe with footwear and accessories, ready for the camera.',
     asset: 'veshti-wide',
    alt: 'Golden pure silk groom shirt paired with a gold-border pattu veshti',
    objectPosition: 'center 12%',
  },
];

function listOf(items: readonly string[]) {
  return items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

export function BrandStory() {
  return <section className="mm-sec" aria-labelledby="story-title">
    <div className="mm-container mm-split">
      <div className="mm-stack mm-reveal mm-reveal--left">
        <div className="mm-stack__a"><SourceImage asset="moodboard" alt="Royal Procession wedding moodboard" responsive sizes="(max-width: 900px) 72vw, 440px" /></div>
        <div className="mm-stack__b"><SourceImage asset="bandhgala-ivory" alt="Groom in an ivory bandhgala" responsive sizes="(max-width: 900px) 55vw, 340px" /></div>
        <div className="mm-stack__badge"><CountUp value={ceremonies.length} /><span>Ceremonies dressed</span></div>
      </div>
      <div className="mm-reveal mm-reveal--right mm-prose">
        <span className="mm-eyebrow">Our Story</span>
        <h2 className="mm-title" id="story-title">From the First Message to the <em>Groom’s Stage</em></h2>
        <div className="mm-gold-line mm-gold-line--static" aria-hidden="true" />
        <p>{brandIntro.title}.</p>
        <p>Each look is designed to its ceremony and theme: {listOf(ceremonies.map(ceremony => ceremony.title))}.</p>
        <p>Every piece is made to measure, then styled head to toe, so the groom arrives at each function complete.</p>
        <p className="mm-sign">— Mister Mapillai, {brandRole.charAt(0).toLowerCase()}{brandRole.slice(1)}</p>
      </div>
    </div>
  </section>;
}

/** The template's Why / What / How cards, filled from the brand copy. */
export function BrandPillars() {
  return <section className="mm-sec mm-sec--flush" aria-labelledby="pillars-title">
    <div className="mm-container">
      <SectionHeading id="pillars-title" eyebrow="Who We Are" title={<>Why. What. <em>How.</em></>} lead="Hover over each card." />
    </div>
    <ul className="mm-container mm-pillars">
      {brandReasons.map((reason, i) => <li className="mm-wcard mm-reveal" style={cssVars({ '--d': `${i * 0.15}s` })} key={reason.label} tabIndex={0}>
        <span className="mm-wcard__big" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
        <span className="mm-eyebrow">{reason.label}</span>
        <h3>{reason.title}</h3>
        <p>{reason.description}</p>
      </li>)}
    </ul>
  </section>;
}

export function MakingTimeline() {
  const timelineRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = timelineRef.current;
    if (!root) return;
    const media = gsap.matchMedia();
    media.add('(prefers-reduced-motion: no-preference)', () => {
      const line = root.querySelector<HTMLElement>('.mm-make__line-fill');
      if (line) {
        gsap.fromTo(line, { scaleY: 0 }, {
          scaleY: 1,
          ease: 'none',
          scrollTrigger: { trigger: root, start: 'top 75%', end: 'bottom 70%', scrub: 0.4 },
        });
      }
      root.querySelectorAll<HTMLElement>('.mm-mk').forEach((step, index) => {
        const pic = step.querySelector('.mm-mk__media');
        const num = step.querySelector('.mm-mk__num');
        const copy = step.querySelector('.mm-mk__copy');
        const tl = gsap.timeline({
          scrollTrigger: { trigger: step, start: 'top 86%', once: true },
        });
        if (pic) tl.from(pic, { opacity: 0, y: 26, duration: 0.75, ease: 'power2.out', clearProps: 'transform,opacity' }, 0);
        if (num) tl.from(num, { opacity: 0, scale: 0.8, duration: 0.45, ease: 'back.out(1.6)', clearProps: 'transform,opacity' }, 0.08 + index * 0.04);
        if (copy) tl.from(copy, { opacity: 0, y: 20, duration: 0.65, ease: 'power2.out', clearProps: 'transform,opacity' }, 0.14);
      });
    });
    return () => media.revert();
  }, []);

  return <section className="mm-sec mm-sec--dark mm-make-sec" aria-labelledby="making-title">
    <div className="mm-container">
      <SectionHeading id="making-title" eyebrow="How We Make" title={<>Every Look, <em>Made by Hand</em></>} />
    </div>
    <div className="mm-container mm-make" ref={timelineRef}>
      <div className="mm-make__line" aria-hidden="true">
        <div className="mm-make__line-fill" />
      </div>
      <ol className="mm-make__list">
        {craftSteps.map((step, i) => <li className={`mm-mk${i % 2 === 1 ? ' mm-mk--reverse' : ''}`} key={step.label}>
          <div className="mm-mk__media">
            {step.externalSrc
              ? <img src={step.externalSrc} alt={step.alt} loading="lazy" decoding="async" style={step.objectPosition ? { objectPosition: step.objectPosition } : undefined} />
              : step.asset
                ? <SourceImage asset={step.asset} alt={step.alt} responsive sizes="(max-width: 900px) 92vw, 520px" style={step.objectPosition ? { objectPosition: step.objectPosition } : undefined} />
                : null}
          </div>
          <div className="mm-mk__num" aria-hidden="true">{step.number}</div>
          <div className="mm-mk__copy">
            <span className="mm-eyebrow">{step.label}</span>
            <h3>{step.title}</h3>
            <p>{step.description}</p>
          </div>
        </li>)}
      </ol>
    </div>
  </section>;
}
