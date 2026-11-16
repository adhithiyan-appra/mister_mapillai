import { BrandLogo } from '../common/BrandLogo';
import { siteNav } from '../../data/navigation';
import { contactConfig } from '../../data/contact';

export function Footer() {
  return (
    <footer className="foot">
      <div className="wrap">
        <BrandLogo />
        <nav aria-label="Footer">
          {siteNav.map(item => (
            <a href={item.href} key={item.href}>{item.label}</a>
          ))}
          <a href={contactConfig.instagram} target="_blank" rel="noopener noreferrer">Instagram</a>
        </nav>
        <div className="small">
          <span>© <span id="yr">{new Date().getFullYear()}</span> Mister Mapillai. Groom and occasion wear for men.</span>
          <span>Bespoke for life’s greatest moments</span>
        </div>
      </div>
    </footer>
  );
}
