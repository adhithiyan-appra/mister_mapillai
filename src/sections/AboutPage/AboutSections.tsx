
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
  objectFit?: 'contain';
  externalSrc?: string;
  asset?: ImageKey;
}

const craftSteps: readonly CraftStep[] = [
  {
    number: 1,
    label: 'Step One',
    title: 'Listen & Sketch',
    description: 'We learn about your events, family traditions and theme, then sketch looks for each ritual with a colour story that flows from Muhurtham to reception.',
    asset: 'step-one-listen-sketch',
    alt: 'Two gold wedding rings resting on woven white fabric with a soft wedding backdrop',
    objectPosition: 'center',
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
    asset: 'sitch',
    alt: 'Bespoke champagne gold sherwani with hand embroidery along collar and shoulders',
    objectPosition: 'center 12%',
  },
  {
    number: 4,
    label: 'Step Four',
    title: 'Fit, Finish & Style',
    description: 'Two trial fittings, final finishing and a quality check — then we style you head to toe with footwear and accessories, ready for the camera.',
    asset: 'image',
    alt: 'Groom in a navy three-piece suit standing in a heritage courtyard',
    objectPosition: 'center',
    objectFit: 'contain',
  },
];

const storyDetailImages = [
  {
    asset: 'about-dome-detail',
    position: 'dome',
    alt: 'Temple dome motif embroidered with gold zari and pearls',
  },
  {
    asset: 'about-heritage-detail',
    position: 'elephant',
    alt: 'Traditional elephant motif embroidered with gold zari',
  },
  {
    asset: 'about-floral-detail',
    position: 'floral',
    alt: 'Gold floral embroidery and pearl craftsmanship detail',
  },
  {
    asset: 'about-vine-detail',
    position: 'vine',
    alt: 'Delicate gold vine embroidery on ceremonial fabric',
  },
  {
    asset: 'about-bud-detail',
    position: 'bud',
    alt: 'Small pearl flower motifs on gold ceremonial fabric',
  },
  {
    asset: 'happy-grooms-place-back',
    position: 'back',
    alt: 'Back yoke of a groom shirt hand-embroidered with a gold temple dome and vine',
  },
  {
    asset: 'happy-grooms-material-beads',
    position: 'beads',
    alt: 'Close-up of polished gold beads used in the embroidery',
  },
] as const satisfies readonly { asset: ImageKey; position: string; alt: string }[];

function listOf(items: readonly string[]) {
  return items.length < 2 ? items.join('') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;
}

export function BrandStory() {
  return <section className="mm-sec" aria-labelledby="story-title">
    <div className="mm-container mm-split">
      <div className="mm-stack mm-story-collage mm-reveal mm-reveal--left">
        {storyDetailImages.map(detail => <div className={`mm-story-collage__tile mm-story-collage__tile--${detail.position}`} key={detail.asset}>
          <SourceImage asset={detail.asset} alt={detail.alt} loading="lazy" />
        </div>)}
        <div className="mm-story-collage__shirt">
          <SourceImage asset="about-devatan-shirt" alt="Complete gold ceremonial groom shirt with hand-embroidered temple and elephant motifs" loading="eager" fetchPriority="high" />
        </div>
        <div className="mm-stack__badge"><CountUp value={12} suffix="+" /><span>Years of craft</span></div>
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
      // Only the vertical line is scroll-linked. The pictures, the copy and the numbered markers all come in through the
      // page's one scroll reveal (.mm-reveal / .is-in, see hooks/useReveal.ts and the .mm-mk__num rule in template.css).
      const line = root.querySelector<HTMLElement>('.mm-make__line-fill');
      if (line) {
        gsap.fromTo(line, { scaleY: 0 }, {
          scaleY: 1,
          ease: 'none',
          scrollTrigger: { trigger: root, start: 'top 75%', end: 'bottom 70%', scrub: 0.4 },
        });
      }
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
          <div className={`mm-mk__media mm-reveal mm-reveal--${i % 2 === 1 ? 'right' : 'left'}`}>
            {step.externalSrc
              ? <img src={step.externalSrc} alt={step.alt} loading="lazy" decoding="async" style={step.objectPosition ? { objectPosition: step.objectPosition } : undefined} />
              : step.asset
                ? <SourceImage asset={step.asset} alt={step.alt} loading="lazy" responsive sizes="(max-width: 900px) 92vw, 520px" style={step.objectPosition || step.objectFit ? { objectPosition: step.objectPosition, objectFit: step.objectFit } : undefined} />
                : null}
          </div>
          <div className="mm-mk__num" aria-hidden="true">{step.number}</div>
          <div className={`mm-mk__copy mm-reveal mm-reveal--${i % 2 === 1 ? 'left' : 'right'}`}>
            <span className="mm-eyebrow">{step.label}</span>
            <h3>{step.title}</h3>
            <p>{step.description}</p>
          </div>
        </li>)}
      </ol>
    </div>
  </section>;
}
