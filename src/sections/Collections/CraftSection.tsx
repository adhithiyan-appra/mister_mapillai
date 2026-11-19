import { ceremonyAssets } from '../../data/assets';
import { bookingHref } from '../../data/navigation';
import { craftHighlights } from '../../data/showcase';

export function CraftSection() {
  return <section className="mm-sec mm-craft" aria-labelledby="craft-title">
    <div className="mm-container mm-split mm-craft__layout">
      <div className="mm-craft__frame mm-reveal mm-reveal--left">
        <img src={ceremonyAssets.chairCoat} alt="Tailored coat displayed on a chair" width="1254" height="1254" loading="lazy" decoding="async" />
      </div>
      <div className="mm-craft__copy mm-reveal mm-reveal--right">
        <span className="mm-eyebrow">FABRIC &amp; CRAFT</span>
        <h2 className="mm-title" id="craft-title">Made by Hand.<br /><em>Made to Last.</em></h2>
        <div className="mm-gold-line mm-gold-line--static" aria-hidden="true" />
        <ul className="mm-list mm-craft__list">
          {craftHighlights.map((item, i) => <li className="mm-reveal" key={item}>
            <b>{String(i + 1).padStart(2, '0')}</b>
            <span>{item}</span>
          </li>)}
        </ul>
        <a href={bookingHref()} className="mm-btn mm-btn--dark mm-craft__cta">DIDN'T FIND YOUR THEME? WE DESIGN IT →</a>
      </div>
    </div>
  </section>;
}
