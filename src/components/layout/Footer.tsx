import { BrandLogo } from '../common/BrandLogo';

export function Footer() {
  return <footer><div className="wrap">
    <BrandLogo />
    <a href="https://www.instagram.com/mistermapillai" target="_blank" rel="noopener noreferrer">Instagram @mistermapillai</a>
    <div className="small">© <span id="yr">{new Date().getFullYear()}</span> Mister Mapillai. Groom and occasion wear for men.</div>
  </div></footer>;
}
