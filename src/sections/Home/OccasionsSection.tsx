import { useState } from 'react';
import type { KeyboardEvent } from 'react';
import { SectionHeading } from '../../components/common/SectionHeading';
import { SourceImage } from '../../components/common/SourceImage';
import { occasionCards } from '../../data/showcase';
import type { OccasionCardItem } from '../../data/showcase';
import { cssVars } from '../../utils/style';

function OccasionCard({ card, index }: { card: OccasionCardItem; index: number }) {
  const [flipped, setFlipped] = useState(false);
  const toggle = () => setFlipped(value => !value);
  const onKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggle(); }
  };
  return <div className="mm-reveal" style={cssVars({ '--d': `${index * 0.15}s` })}>
    <div
      className={`mm-flip${flipped ? ' is-flipped' : ''}`}
      role="button"
      tabIndex={0}
      aria-pressed={flipped}
      aria-label={`${card.name}: ${card.subtitle}. Show what's included`}
      onClick={toggle}
      onKeyDown={onKey}
    >
      <div className="mm-flip__in">
        <div className="mm-face mm-face--front">
          <SourceImage asset={card.image} alt="" loading="lazy" responsive sizes="(max-width: 640px) 92vw, (max-width: 1000px) 46vw, 380px" />
          <div className="mm-face__info">
            <small>{card.subtitle}</small>
            <h3>{card.name}</h3>
            <small style={{ opacity: 0.7 }}>Tap to explore ↻</small>
          </div>
        </div>
        <div className="mm-face mm-face--back">
          <small style={{ color: 'var(--mm-gold-light)' }}>WHAT&rsquo;S INCLUDED</small>
          <h3>{card.name}</h3>
          <ul>{card.included.map(item => <li key={item}>{item}</li>)}</ul>
          <a
            href={`/collections?occasion=${encodeURIComponent(card.key)}`}
            className="mm-btn mm-btn--gold mm-btn--sm"
            onClick={event => event.stopPropagation()}
            tabIndex={flipped ? 0 : -1}
          >
            View Looks
          </a>
        </div>
      </div>
    </div>
  </div>;
}

export function OccasionsSection() {
  return <section className="mm-sec" aria-labelledby="occasions-title">
    <div className="mm-container">
      <SectionHeading
        id="occasions-title"
        eyebrow="Our Collections"
        title={<>Dressed for Every <em>Ritual</em></>}
        lead="Each ceremony carries its own meaning. Hover or tap a card to see what's included."
      />
    </div>
    <div className="mm-container mm-occasions">
      {occasionCards.map((card, i) => <OccasionCard card={card} index={i} key={card.key} />)}
    </div>
  </section>;
}
