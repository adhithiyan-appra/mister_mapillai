import { useEffect, useRef } from 'react';
import { SectionHeading } from '../../components/common/SectionHeading';
import { SourceImage } from '../../components/common/SourceImage';
import { accessoryAddons } from '../../data/showcase';
import type { ImageKey } from '../../data/images';
import { cssVars } from '../../utils/style';

const accessoryImages: Partial<Record<string, ImageKey>> = {
  brooch: 'orbit-brooch',
  watch: 'orbit-watch',
  'pocket-square': 'orbit-pocket-square',
  cufflinks: 'orbit-cufflinks',
  footwear: 'orbit-footwear',
  stole: 'orbit-stole',
  turban: 'orbit-turban',
};

function AccessoryIcon({ name }: { name: string }) {
  const common = {
    viewBox: '0 0 48 48',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  };

  switch (name) {
    case 'brooch':
      return <svg {...common}><path d="M24 8.5c2.1 4.2 4.8 6.1 9.2 6.4-2.9 3.4-3.5 6.8-2 10.9-4.4-.5-7.3.9-9.5 4.8-2.2-3.9-5.1-5.3-9.5-4.8 1.5-4.1.9-7.5-2-10.9 4.4-.3 7.1-2.2 9.2-6.4 1.5 1.6 3.1 1.6 4.6 0Z" /><circle cx="21.7" cy="20.2" r="4.6" /><path d="m18.6 29.1-2.7 10.4 5.8-3.9 5.8 3.9-2.7-10.4" /></svg>;
    case 'watch':
      return <svg {...common}><path d="m19 14 1.4-8h7.2l1.4 8M19 34l1.4 8h7.2l1.4-8" /><circle cx="24" cy="24" r="11" /><circle cx="24" cy="24" r="8" /><path d="M24 18.5V24l4 2.2" /></svg>;
    case 'pocket-square':
      return <svg {...common}><path d="M11 19h26l-3.2 21H14.2L11 19Z" /><path d="m14 19 6-9 4 7 5-10 5 12M18 27h12" /></svg>;
    case 'mala':
      return <svg {...common}><path d="M12 10.5c0 14 3.8 24.5 12 27 8.2-2.5 12-13 12-27" /><path d="M24 37.5v5" /><circle cx="12.4" cy="14" r="1.7" /><circle cx="14.4" cy="22" r="1.7" /><circle cx="18" cy="29.2" r="1.7" /><circle cx="24" cy="34" r="1.7" /><circle cx="30" cy="29.2" r="1.7" /><circle cx="33.6" cy="22" r="1.7" /><circle cx="35.6" cy="14" r="1.7" /></svg>;
    case 'cufflinks':
      return <svg {...common}><rect x="8" y="12" width="14" height="14" rx="3" transform="rotate(-10 8 12)" /><rect x="26" y="22" width="14" height="14" rx="3" transform="rotate(10 26 22)" /><path d="m21 24 7 3" /><path d="m13.5 17.5 3.5 3.5m-5.2.2 7-7M31 27l4 4m-6 .2 8-8" /></svg>;
    case 'footwear':
      return <svg {...common}><path d="M8 29.5c5.8.2 10.2-1.2 13.3-4.3l2.6-2.6c1.4-1.4 3.4-1.8 5.2-1l10.2 4.5c1.7.8 2.7 2.4 2.7 4.3 0 2.6-2.1 4.6-4.6 4.6H10.8C8.1 35 6 32.9 6 30.2v-.7h2Z" /><path d="M20.2 26.2 24 30m-7-1 3 3m9.2-9.8-2.7 4.2" /></svg>;
    case 'turban':
      return <svg {...common}><path d="M8.5 31.5c.8-10.6 6.8-17 15.5-17s14.7 6.4 15.5 17H8.5Z" /><path d="M12 31.5c1.4-7.8 5.8-12.4 12-12.4s10.6 4.6 12 12.4M16.5 31.5c1.3-5 3.8-7.8 7.5-7.8s6.2 2.8 7.5 7.8M24 14.5v17" /><path d="M8.5 31.5h31L36 37H12l-3.5-5.5Z" /></svg>;
    case 'stole':
      return <svg {...common}><path d="M16 7c2.5 5 5.1 7.4 8 7.4S29.5 12 32 7l3 3.5-5 29-6-4-6 4-5-29L16 7Z" /><path d="m18 14 2.5 17.5L24 29l3.5 2.5L30 14M17.8 39.5l.7 3m3-5.2.5 3m8.2-.8-.7 3m-3-5.2-.5 3" /></svg>;
    default:
      return null;
  }
}

/** Eight accessories orbiting the finished look. */
export function StylingOrbit() {
  const orbitRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const orbit = orbitRef.current;
    if (!orbit || !('IntersectionObserver' in window)) return;
    const observer = new IntersectionObserver(([entry]) => {
      orbit.classList.toggle('is-orbiting', entry.isIntersecting);
    }, { rootMargin: '80px' });
    observer.observe(orbit);
    return () => observer.disconnect();
  }, []);

  return <section className="mm-sec mm-sec--white" id="head-to-toe-styling" style={{ overflow: 'hidden' }} aria-labelledby="orbit-title">
    <div className="mm-container">
      <SectionHeading
        id="orbit-title"
        eyebrow="Complete the Look"
        title={<>Head-to-Toe <em>Styling</em></>}
        lead="Every accessory chosen to complete your look."
      />
    </div>
    <div className="mm-orbit mm-reveal mm-reveal--zoom" ref={orbitRef}>
      <div className="mm-orbit__path" aria-hidden="true" />
      <div className="mm-orbit__center"><SourceImage asset="orbit-groom" alt="Complete ceremonial look: embroidered shirt, gold-buckle belt, black trousers and oxfords" /></div>
      <ul className="mm-orbit__ring" aria-label="Head-to-toe accessories">
        {accessoryAddons.map((item, i) => {
          const asset = accessoryImages[item.icon];
          return <li className="mm-orbit__item" style={cssVars({
          '--a': `${-112.5 + (i / accessoryAddons.length) * 360}deg`,
          '--orbit-delay': `${180 + i * 75}ms`,
        })} key={item.name}>
          <div className="mm-orbit__chip">
            <div className="mm-orbit__content">
              {asset
                ? <SourceImage asset={asset} alt="" loading="lazy" />
                : <AccessoryIcon name={item.icon} />}
              <b className={item.icon === 'stole' ? 'mm-orbit__label--long' : undefined}>{item.name}</b>
            </div>
          </div>
        </li>})}
      </ul>
    </div>
  </section>;
}
