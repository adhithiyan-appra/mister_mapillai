import { useEffect, useRef, useState } from 'react';
import { BrandLogo } from '../common/BrandLogo';
import { useSceneAnimation } from '../animations/AnimationProvider';
import { fittingHref, siteNav } from '../../data/navigation';
import { useRouter } from '../../router';
import { writeStyle } from '../../utils/animation';

export function Header() {
  const ref = useRef<HTMLElement>(null);
  const barRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const { path } = useRouter();
  const closeMenu = (restoreFocus = false) => {
    setMenuOpen(false);
    if (restoreFocus) requestAnimationFrame(() => menuButtonRef.current?.focus());
  };

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
    const root = document.documentElement;
    const body = document.body;
    const scrollY = window.scrollY;
    root.classList.add('mm-menu-open');
    body.style.top = `-${scrollY}px`;
    const focusables = () => [
      ...Array.from(navRef.current?.querySelectorAll<HTMLElement>('a[href], button:not([disabled])') ?? []),
      ...(menuButtonRef.current ? [menuButtonRef.current] : []),
    ];
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        closeMenu(true);
        return;
      }
      if (event.key !== 'Tab') return;
      const items = focusables();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    const desktop = matchMedia('(min-width:1101px)');
    const onDesktop = () => { if (desktop.matches) closeMenu(); };
    document.addEventListener('keydown', onKey);
    desktop.addEventListener('change', onDesktop);
    return () => {
      document.removeEventListener('keydown', onKey);
      desktop.removeEventListener('change', onDesktop);
      root.classList.remove('mm-menu-open');
      body.style.top = '';
      window.scrollTo(0, scrollY);
    };
  }, [menuOpen]);

  return <>
    <div className="mm-progress-bar" ref={barRef} aria-hidden="true" />
    <header className="mm mm-nav" id="top" ref={ref}>
      <div className="mm-container mm-nav__inner">
        <BrandLogo />
        <nav className={`mm-nav__links${menuOpen ? ' is-open' : ''}`} id="site-nav" aria-label="Primary" ref={navRef}>
          {siteNav.map(item => <a className="mm-nav__link" href={item.href} key={item.href} aria-current={path === item.href ? 'page' : undefined} onClick={() => closeMenu(true)}>{item.label}</a>)}
          <a className="mm-btn mm-btn--outline mm-nav__cta" href={fittingHref} aria-current={path === fittingHref ? 'page' : undefined} onClick={() => closeMenu(true)}>Book Your Look</a>
        </nav>
        <button className="mm-menu-btn" type="button" ref={menuButtonRef} aria-label={menuOpen ? 'Close menu' : 'Open menu'} aria-expanded={menuOpen} aria-controls="site-nav" onClick={() => setMenuOpen(open => !open)}>
          <span /><span /><span />
        </button>
      </div>
    </header>
  </>;
}
