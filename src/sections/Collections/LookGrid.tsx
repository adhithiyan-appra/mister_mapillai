import type { PointerEvent as ReactPointerEvent } from 'react';
import { SectionHeading } from '../../components/common/SectionHeading';
import { SourceImage } from '../../components/common/SourceImage';
import { bookingHref } from '../../data/navigation';
import { occasionText, outfitFilters, outfitsFor } from '../../data/outfits';
import type { Outfit, OutfitFilter } from '../../data/outfits';
import { cssVars } from '../../utils/style';

const canTilt = () => matchMedia('(hover: hover) and (pointer: fine)').matches && !matchMedia('(prefers-reduced-motion: reduce)').matches;

function tilt(event: ReactPointerEvent<HTMLElement>) {
  if (event.pointerType !== 'mouse' || !canTilt()) return;
  const card = event.currentTarget;
  const rect = card.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width - 0.5;
  const y = (event.clientY - rect.top) / rect.height - 0.5;
  card.style.transform = `rotateY(${(x * 14).toFixed(2)}deg) rotateX(${(-y * 14).toFixed(2)}deg) translateY(-6px)`;
}

function LookCard({ outfit, index, onOpen }: { outfit: Outfit; index: number; onOpen: (id: string) => void }) {
  return <li className="mm-look" style={cssVars({ '--d': `${index * 0.06}s` })} onPointerMove={tilt} onPointerLeave={event => { event.currentTarget.style.transform = ''; }}>
    <button type="button" className="mm-look__media" onClick={() => onOpen(outfit.id)} aria-label={`View details: ${outfit.title}`}>
      <SourceImage asset={outfit.thumbnail} loading="lazy" nativeLazy responsive sizes="(max-width: 430px) calc(100vw - 32px), (max-width: 767px) 500px, (max-width: 1023px) 47vw, 380px" alt={outfit.title} />
    </button>
    <div className="mm-look__body">
      <span className="mm-look__tag">{occasionText(outfit)}</span>
      <h3>{outfit.title}</h3>
      <p>{outfit.description}</p>
      <div className="mm-btns">
        <button type="button" className="mm-btn mm-btn--outline-dark mm-btn--sm" onClick={() => onOpen(outfit.id)}>Details</button>
        <a href={bookingHref(outfit.id)} className="mm-btn mm-btn--dark mm-btn--sm">Book This Look</a>
      </div>
    </div>
  </li>;
}

interface LookGridProps {
  filter: OutfitFilter;
  onFilter: (filter: OutfitFilter) => void;
  onOpen: (id: string) => void;
}

export function LookGrid({ filter, onFilter, onOpen }: LookGridProps) {
  const looks = outfitsFor(filter);
  return <section className="mm-sec" id="looks" aria-labelledby="looks-title">
    <div className="mm-container">
      <SectionHeading id="looks-title" eyebrow="Browse All" title={<>Find Your <em>Look</em></>} lead="Each look is a starting point. Every piece is tailored to you." className="mm-looks-head" />
      <div className="mm-tabs mm-looks-tabs" role="group" aria-label="Filter by occasion">
        {outfitFilters.map(item => <button type="button" className="mm-tab" key={item.id} aria-pressed={item.id === filter} onClick={() => onFilter(item.id)}>{item.label}</button>)}
      </div>
      <p className="mm-sr" aria-live="polite">{looks.length} looks shown</p>
      {looks.length
        ? <ul className="mm-looks" key={filter}>{looks.map((outfit, i) => <LookCard outfit={outfit} index={i} onOpen={onOpen} key={outfit.id} />)}</ul>
        : <p className="mm-empty">No looks for this occasion yet. <a className="mm-link" href={bookingHref()}>We can design one for you</a>.</p>}
    </div>
  </section>;
}
