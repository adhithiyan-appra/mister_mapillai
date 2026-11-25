import { SectionHeading } from '../../components/common/SectionHeading';
import { SourceImage } from '../../components/common/SourceImage';
import { contactConfig, mapsUrl, whatsappUrl } from '../../data/contact';
import type { ImageKey } from '../../data/images';
import { fittingHref } from '../../data/navigation';
import { cssVars } from '../../utils/style';

interface OpenStudioLocation {
  id: string;
  status: 'open';
  title: string;
  image: ImageKey;
  imageAlt: string;
  address: string;
  hours?: string;
  directionsHref?: string;
  bookHref: string;
}

interface UpcomingStudioLocation {
  id: string;
  status: 'upcoming';
  title: string;
  image: ImageKey;
  imageAlt: string;
  meta: string;
  progressId: string;
  progressPercent: number;
  progressDelay: string;
  opening: string;
}

type StudioLocation = OpenStudioLocation | UpcomingStudioLocation;

const CARD_IMAGE_SIZES = '(max-width: 640px) 92vw, (max-width: 900px) 46vw, 280px';

/**
 * Configurable studio details for Avinashi. Provide VITE_AVINASHI_ADDRESS,
 * VITE_AVINASHI_HOURS, and/or VITE_AVINASHI_MAPS_URL (or update this config)
 * once the official Avinashi studio details and photograph are ready.
 */
const avinashiAddress = import.meta.env.VITE_AVINASHI_ADDRESS?.trim() || '';
const avinashiHours = import.meta.env.VITE_AVINASHI_HOURS?.trim() || '';
const avinashiDirectionsHref =
  import.meta.env.VITE_AVINASHI_MAPS_URL?.trim() ||
  (avinashiAddress ? mapsUrl(avinashiAddress) : undefined);

/**
 * Studio-location showcase: Avinashi (open), Tiruppur Flagship (open),
 * Coimbatore (upcoming), and an invitation to request a studio.
 * Coming-soon cards are deliberately inert.
 */
export function StudioSection() {
  const { address, hours } = contactConfig;
  const tiruppurDirectionsHref = mapsUrl(address);
  const requestMessage = 'Hi Mister Mapillai, I would love a Mister Mapillai studio in my city. Here is the city I have in mind:';
  const requestHref = whatsappUrl(requestMessage) ?? contactConfig.instagram;

  const studios: readonly StudioLocation[] = [
    {
      id: 'avinashi',
      status: 'open',
      title: 'Avinashi',
      image: 'double-breasted',
      imageAlt: 'Bespoke groom styling at the Avinashi studio',
      address: avinashiAddress || 'Avinashi, Tamil Nadu',
      hours: avinashiHours || undefined,
      directionsHref: avinashiDirectionsHref,
      bookHref: fittingHref,
    },
    {
      id: 'tiruppur-flagship',
      status: 'open',
      title: 'Tiruppur Flagship',
      image: 'threepiece',
      imageAlt: 'Groom in a sand beige three-piece suit at the Tiruppur flagship studio',
      address,
      hours,
      directionsHref: tiruppurDirectionsHref,
      bookHref: fittingHref,
    },
    {
      id: 'coimbatore',
      status: 'upcoming',
      title: 'Coimbatore',
      image: 'bandhgala-ivory',
      imageAlt: 'Groom in an ivory bandhgala',
      meta: 'RS Puram, Coimbatore',
      progressId: 'coimbatore-progress',
      progressPercent: 70,
      progressDelay: '.35s',
      opening: 'Opening early 2027',
    },
  ];

  const revealDelays = [undefined, '.12s', '.24s'] as const;

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
      {studios.map((studio, index) => {
        const delay = revealDelays[index];
        const delayStyle = delay ? cssVars({ '--d': delay }) : undefined;
        if (studio.status === 'open') {
          return <li className="mm-studio-card mm-reveal" style={delayStyle} key={studio.id}>
            <div className="mm-studio-card__media">
              <span className="mm-studio-card__badge mm-studio-card__badge--open">Open Now</span>
              <SourceImage asset={studio.image} alt={studio.imageAlt} loading="lazy" responsive sizes={CARD_IMAGE_SIZES} />
            </div>
            <div className="mm-studio-card__body">
              <h3 className="mm-studio-card__title">{studio.title}</h3>
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
            <h3 className="mm-studio-card__title">{studio.title}</h3>
            <p className="mm-studio-card__meta">{studio.meta}</p>
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
