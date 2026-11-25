import { SectionHeading } from '../../components/common/SectionHeading';
import { SourceImage } from '../../components/common/SourceImage';
import { contactConfig, whatsappUrl } from '../../data/contact';
import { studioLocations } from '../../data/studios';
import { cssVars } from '../../utils/style';

const CARD_IMAGE_SIZES = '(max-width: 640px) 92vw, (max-width: 900px) 46vw, 280px';
const REVEAL_DELAYS = [undefined, '.12s', '.24s'] as const;

/**
 * Studio-location showcase backed by the shared studioLocations source of truth
 * (Avinashi, Tiruppur Flagship, Coimbatore) plus an invitation to request a studio.
 * Coming-soon cards are deliberately inert.
 */
export function StudioSection() {
  const requestMessage = 'Hi Mister Mapillai, I would love a Mister Mapillai studio in my city. Here is the city I have in mind:';
  const requestHref = whatsappUrl(requestMessage) ?? contactConfig.instagram;

  return <section className="mm-sec" aria-labelledby="studio-title">
    <div className="mm-container mm-studios__head">
      <SectionHeading
        id="studio-title"
        eyebrow="Our Studio"
        title={<>Visit a <em>Mister Mapillai</em> Studio</>}
        lead="One flagship studio today — and more on the way."
      />
    </div>
    <ul className="mm-container mm-studios__grid">
      {studioLocations.map((studio, index) => {
        const delay = REVEAL_DELAYS[index];
        const delayStyle = delay ? cssVars({ '--d': delay }) : undefined;
        if (studio.status === 'open') {
          return <li className="mm-studio-card mm-reveal" style={delayStyle} key={studio.id}>
            <div className="mm-studio-card__media">
              <span className="mm-studio-card__badge mm-studio-card__badge--open">Open Now</span>
              <SourceImage
                asset={studio.image}
                alt={studio.imageAlt}
                loading="lazy"
                responsive
                sizes={CARD_IMAGE_SIZES}
                style={studio.imagePosition ? { objectPosition: studio.imagePosition } : undefined}
              />
            </div>
            <div className="mm-studio-card__body">
              <h3 className="mm-studio-card__title">{studio.name}</h3>
              <p className="mm-studio-card__meta">{studio.address}</p>
              {studio.hours ? <p className="mm-studio-card__hours"><b>Working Hours</b><br />{studio.hours}</p> : null}
              <div className="mm-studio-card__actions">
                {studio.directionsHref
                  ? <a className="mm-btn mm-btn--dark" href={studio.directionsHref} target="_blank" rel="noopener noreferrer">Directions</a>
                  : null}
                <a
                  className="mm-btn mm-btn--outline-dark"
                  href={studio.bookHref}
                  style={studio.directionsHref ? undefined : { gridColumn: '1 / -1' }}
                >
                  Book Here
                </a>
              </div>
            </div>
          </li>;
        }
        return <li className="mm-studio-card mm-studio-card--upcoming mm-reveal" style={delayStyle} key={studio.id}>
          <div className="mm-studio-card__media">
            <span className="mm-studio-card__badge">Coming Soon</span>
            <SourceImage asset={studio.image} alt={studio.imageAlt} loading="lazy" responsive sizes={CARD_IMAGE_SIZES} />
          </div>
          <div className="mm-studio-card__body">
            <h3 className="mm-studio-card__title">{studio.name}</h3>
            <p className="mm-studio-card__meta">{studio.address}</p>
            <p className="mm-studio-card__progress-label" id={studio.progressId}>Work in Progress · {studio.progressPercent}%</p>
            <div className="mm-studio-card__progress" role="progressbar" aria-labelledby={studio.progressId} aria-valuemin={0} aria-valuemax={100} aria-valuenow={studio.progressPercent}>
              <span style={cssVars({ '--f': `${studio.progressPercent}%`, '--d': studio.progressDelay })} />
            </div>
            <p className="mm-studio-card__opening">{studio.opening}</p>
          </div>
        </li>;
      })}
      <li className="mm-studio-card mm-studio-card--promo mm-reveal" style={cssVars({ '--d': '.36s' })}>
        <svg className="mm-studio-card__star" viewBox="0 0 48 48" fill="none" aria-hidden="true">
          <path d="M24 2l4.2 17.8L46 24l-17.8 4.2L24 46l-4.2-17.8L2 24l17.8-4.2L24 2z" stroke="currentColor" strokeWidth="1.4" fill="none" />
          <circle cx="24" cy="24" r="3" fill="currentColor" />
        </svg>
        <h3 className="mm-studio-card__promo-title">More Cities</h3>
        <p className="mm-studio-card__promo-text">Want a Mister Mapillai studio in your city? Tell us.</p>
        <a className="mm-btn mm-btn--outline" href={requestHref} target="_blank" rel="noopener noreferrer">Request a Studio</a>
      </li>
    </ul>
  </section>;
}
