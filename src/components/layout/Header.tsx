import { useEffect, useRef, useState } from 'react';
import { BrandLogo } from '../common/BrandLogo';
import { useSceneAnimation } from '../animations/AnimationProvider';
import { fittingHref, siteNav } from '../../data/navigation';
import { useRouter } from '../../router';
import { writeStyle } from '../../utils/animation';

export function Header() {
  const ref = useRef<HTMLElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const { path } = useRouter();
  const closeMenu = () => setMenuOpen(false);

  // Compact bar and reading progress run on the shared animation scheduler,
  // so scrolling adds no listeners of its own.
  useSceneAnimation(ref, header => {
    let small: boolean | undefined;
    let scrollable = 1;
    return {
      id: 'header',
      layout(frame) { scrollable = Math.max(1, document.documentElement.scrollHeight - frame.height); },
      update(_, frame) {
        const next = frame.scrollY > 60;
        if (next !== small) { small = next; header.classList.toggle('is-small', next); }
        if (barRef.current) writeStyle(barRef.current, 'transform', `scaleX(${Math.min(1, frame.scrollY / scrollable).toFixed(4)})`);
      },
    };
  });

  useEffect(() => { setMenuOpen(false); }, [path]);
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setMenuOpen(false); };
    const desktop = matchMedia('(min-width:1101px)');
    const onDesktop = () => { if (desktop.matches) setMenuOpen(false); };
    document.addEventListener('keydown', onKey);
    desktop.addEventListener('change', onDesktop);
    return () => {
      document.removeEventListener('keydown', onKey);
      desktop.removeEventListener('change', onDesktop);
    };
  }, [menuOpen]);

  return <>
    <div className="mm-progress-bar" ref={barRef} aria-hidden="true" />
    <header className="mm mm-nav" id="top" ref={ref}>
      <div className="mm-container mm-nav__inner">
        <BrandLogo />
        <nav className={`mm-nav__links${menuOpen ? ' is-open' : ''}`} id="site-nav" aria-label="Primary">
          {siteNav.map(item => <a className="mm-nav__link" href={item.href} key={item.href} aria-current={path === item.href ? 'page' : undefined} onClick={closeMenu}>{item.label}</a>)}
          <a className="mm-btn mm-btn--outline mm-nav__cta" href={fittingHref} aria-current={path === fittingHref ? 'page' : undefined} onClick={closeMenu}>Book Your Look</a>
        </nav>
        <button className="mm-menu-btn" type="button" aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} aria-controls="site-nav" onClick={() => setMenuOpen(open => !open)}>
          <span /><span /><span />
        </button>
      </div>
    </header>
  </>;
}
