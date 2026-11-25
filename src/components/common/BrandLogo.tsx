import type { MouseEvent } from 'react';
import { requestSmoothTop, useRouter } from '../../router';
import { requestHeroReset } from '../../utils/heroState';
import { cancelScrollRestore } from '../../utils/scrollRestore';

interface BrandLogoProps {
  onClick?: (event: MouseEvent<HTMLAnchorElement>) => void;
}

export function BrandLogo({ onClick }: BrandLogoProps = {}) {
  const { path, search, hash, navigate } = useRouter();

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    event.preventDefault();
    cancelScrollRestore();

    if (path === '/') {
      requestHeroReset();
      if (hash) {
        requestSmoothTop();
        navigate('/', { replace: true });
        return;
      }
      if (search) navigate('/', { replace: true });
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, left: 0, behavior: reduced ? 'auto' : 'smooth' });
      return;
    }

    navigate('/');
  };

  return (
    <a className="lock" href="/" aria-label="Mister Mapillai home" onClick={handleClick}>
      <span className="mono gold-text">M</span><span className="bar" />
      <span className="words"><span className="w1 gold-text">MISTER<sup>™</sup></span><span className="w2 gold-text">MAPILLAI</span></span>
    </a>
  );
}
