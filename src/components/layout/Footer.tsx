import { BrandLogo } from '../common/BrandLogo';
import { fittingHref, siteNav } from '../../data/navigation';
import { contactConfig, generalEnquiry, mapsUrl, telHref, whatsappUrl } from '../../data/contact';

export function Footer() {
  const chat = whatsappUrl(generalEnquiry);
  return (
    <footer className="mm mm-foot">
      <div className="mm-container mm-foot__grid">
        <div className="mm-foot__brand">
          <BrandLogo />
          <p>Bespoke wedding wear for the South Indian groom — designed, stitched and styled head to toe for every ritual.</p>
        </div>
        <nav aria-labelledby="foot-explore">
          <h2 id="foot-explore">Explore</h2>
          <ul>
            {siteNav.map(item => <li key={item.href}><a href={item.href}>{item.label}</a></li>)}
            <li><a href={fittingHref}>Book Your Look</a></li>
          </ul>
        </nav>
        <div>
          <h2>Studio</h2>
          <ul>
            <li>
              <a href={mapsUrl(contactConfig.address)} target="_blank" rel="noopener noreferrer">
                {contactConfig.addressLines[0]}
              </a>
            </li>
            <li>{contactConfig.addressLines[1]}</li>
            <li>{contactConfig.hours}</li>
          </ul>
        </div>
        <div>
          <h2>Connect</h2>
          <ul>
            <li><a href={telHref(contactConfig.phone)}>{contactConfig.phone}</a></li>
            {chat ? <li><a href={chat} target="_blank" rel="noopener noreferrer">WhatsApp</a></li> : null}
            <li><a href={contactConfig.instagram} target="_blank" rel="noopener noreferrer">Instagram {contactConfig.instagramHandle}</a></li>
            <li><a href={`mailto:${contactConfig.email}`}>{contactConfig.email}</a></li>
          </ul>
        </div>
      </div>
      <div className="mm-container mm-foot__bottom">
        <span>© 2026 Mister Mapillai · A Shub Vaibhav Pvt Ltd brand</span>
        <span>Designed &amp; built by Appra Technologies</span>
      </div>
    </footer>
  );
}
