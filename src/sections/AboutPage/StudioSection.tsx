import { SectionHeading } from '../../components/common/SectionHeading';
import { SourceImage } from '../../components/common/SourceImage';
import { contactConfig, mapsUrl, whatsappUrl } from '../../data/contact';
import { fittingHref } from '../../data/navigation';
import { cssVars } from '../../utils/style';

/**
 * Studio-location showcase: one open flagship, two upcoming studios and an
 * invitation to request a studio. Coming-soon cards are deliberately inert.
 */
export function StudioSection() {
  const { address, hours } = contactConfig;
  const directionsHref = mapsUrl(address);
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
      <li className="mm-studio-card mm-reveal">
        <div className="mm-studio-card__media">
          <span className="mm-studio-card__badge mm-studio-card__badge--open">Open Now</span>
          <SourceImage asset="threepiece" alt="Groom in a sand beige three-piece suit at the Tiruppur flagship studio" loading="lazy" responsive sizes="(max-width: 640px) 92vw, (max-width: 900px) 46vw, 280px" />
        </div>
        <div className="mm-studio-card__body">
          <h3 className="mm-studio-card__title">Tiruppur Flagship</h3>
          <p className="mm-studio-card__meta">{address}</p>
          <p className="mm-studio-card__hours"><b>Working Hours</b><br />{hours}</p>
          <div className="mm-studio-card__actions">
            <a className="mm-btn mm-btn--dark" href={directionsHref} target="_blank" rel="noopener noreferrer">Directions</a>
            <a className="mm-btn mm-btn--outline-dark" href={fittingHref}>Book Here</a>
          </div>
        </div>
      </li>
      <li className="mm-studio-card mm-studio-card--upcoming mm-reveal" style={cssVars({ '--d': '.1s' })}>
        <div className="mm-studio-card__media">
          <span className="mm-studio-card__badge">Coming Soon</span>
          <SourceImage asset="bandhgala-ivory" alt="Groom in an ivory bandhgala" loading="lazy" responsive sizes="(max-width: 640px) 92vw, (max-width: 900px) 46vw, 280px" />
        </div>
        <div className="mm-studio-card__body">
          <h3 className="mm-studio-card__title">Coimbatore</h3>
          <p className="mm-studio-card__meta">RS Puram, Coimbatore</p>
          <p className="mm-studio-card__progress-label" id="coimbatore-progress">Work in Progress · 70%</p>
          <div className="mm-studio-card__progress" role="progressbar" aria-labelledby="coimbatore-progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={70}>
            <span style={cssVars({ '--f': '70%', '--d': '.35s' })} />
          </div>
          <p className="mm-studio-card__opening">Opening early 2027</p>
        </div>
      </li>
      <li className="mm-studio-card mm-studio-card--upcoming mm-reveal" style={cssVars({ '--d': '.2s' })}>
        <div className="mm-studio-card__media">
          <span className="mm-studio-card__badge">Coming Soon</span>
          <SourceImage asset="double-breasted" alt="Tailored double-breasted suit" loading="lazy" responsive sizes="(max-width: 640px) 92vw, (max-width: 900px) 46vw, 280px" />
        </div>
        <div className="mm-studio-card__body">
          <h3 className="mm-studio-card__title">Erode</h3>
          <p className="mm-studio-card__meta">Perundurai Road, Erode</p>
          <p className="mm-studio-card__progress-label" id="erode-progress">Work in Progress · 35%</p>
          <div className="mm-studio-card__progress" role="progressbar" aria-labelledby="erode-progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={35}>
            <span style={cssVars({ '--f': '35%', '--d': '.5s' })} />
          </div>
          <p className="mm-studio-card__opening">Opening mid 2027</p>
        </div>
      </li>
      <li className="mm-studio-card mm-studio-card--promo mm-reveal" style={cssVars({ '--d': '.3s' })}>
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
