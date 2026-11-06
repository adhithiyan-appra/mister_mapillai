import { useEffect, useRef, useState } from 'react';
import { BrandLogo } from '../common/BrandLogo';
import { Button } from '../common/Button';
import { useSceneAnimation } from '../animations/AnimationProvider';

const navigation = [
  ['#journey', 'Our process'],
  ['#ceremonies', 'Ceremonies'],
  ['#headtotoe', 'Head to toe'],
  ['#collection', 'Collection'],
  ['#devatan', 'Signature'],
] as const;

export function Header() {
  const ref = useRef<HTMLElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);
  useSceneAnimation(ref, header => {
    let scrolled: boolean | undefined;
    return { id: 'header', update(_, frame) {
      const next = frame.scrollY > 30;
      if (next !== scrolled) { scrolled = next; header.classList.toggle('scrolled', next); }
    } };
  });
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenuOpen(false); };
    const desktop = matchMedia('(min-width:1024px)');
    const onDesktop = () => { if (desktop.matches) setMenuOpen(false); };
    document.addEventListener('keydown', onKey);
    desktop.addEventListener('change', onDesktop);
    return () => {
      document.removeEventListener('keydown', onKey);
      desktop.removeEventListener('change', onDesktop);
    };
  }, [menuOpen]);
  return <header className="top" id="top" ref={ref}>
    <div className="wrap">
      <BrandLogo />
      <nav className="desk-nav" aria-label="Primary">
        {navigation.map(([href, label]) => <a href={href} key={href}>{label}</a>)}
      </nav>
      <button className={`menu-btn${menuOpen ? ' on' : ''}`} type="button" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} aria-controls="mobile-nav" onClick={() => setMenuOpen(open => !open)}>
        <span /><span /><span />
      </button>
      <Button className="top-cta" href="#consult">Book a fitting</Button>
    </div>
    <div className={`mobile-nav${menuOpen ? ' open' : ''}`} id="mobile-nav" aria-hidden={!menuOpen}>
      <nav aria-label="Mobile primary">
        {navigation.map(([href, label]) => <a href={href} key={href} onClick={closeMenu}>{label}</a>)}
      </nav>
      <Button href="#consult" onClick={closeMenu}>Book a fitting</Button>
    </div>
  </header>;
}
