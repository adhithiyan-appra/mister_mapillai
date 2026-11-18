import { useCallback, useEffect, useRef } from 'react';
import { PageBanner } from '../components/common/PageBanner';
import { isOutfitFilter, outfitById } from '../data/outfits';
import type { OutfitFilter } from '../data/outfits';
import { useRouter } from '../router';
import { CollectionCarousel } from '../sections/Collections/CollectionCarousel';
import { CraftSection } from '../sections/Collections/CraftSection';
import { LookDialog } from '../sections/Collections/LookDialog';
import { LookGrid } from '../sections/Collections/LookGrid';
import { StylingOrbit } from '../sections/Collections/StylingOrbit';

/**
 * The URL is the state: `?occasion=` filters the grid (as before) and
 * `?look=` opens a look's details, so both survive refresh, sharing and the
 * browser's back and forward buttons.
 */
export function CollectionsPage() {
  const { search, navigate } = useRouter();
  const params = new URLSearchParams(search);
  const occasion = params.get('occasion') ?? 'all';
  const filter: OutfitFilter = isOutfitFilter(occasion) ? occasion : 'all';
  const open = outfitById(params.get('look'));
  // True while the open dialog has its own history entry, so closing goes back.
  const pushed = useRef(false);

  useEffect(() => {
    const onPop = () => { pushed.current = false; };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const withParams = useCallback((change: (next: URLSearchParams) => void) => {
    const next = new URLSearchParams(window.location.search);
    change(next);
    const query = next.toString();
    return `/collections${query ? `?${query}` : ''}${window.location.hash}`;
  }, []);

  const openLook = useCallback((id: string) => {
    pushed.current = true;
    navigate(withParams(next => next.set('look', id)));
  }, [navigate, withParams]);

  const closeLook = useCallback(() => {
    if (pushed.current) { pushed.current = false; history.back(); return; }
    navigate(withParams(next => next.delete('look')), { replace: true });
  }, [navigate, withParams]);

  const setFilter = useCallback((next: OutfitFilter) => {
    navigate(withParams(params => { if (next === 'all') params.delete('occasion'); else params.set('occasion', next); }), { replace: true });
  }, [navigate, withParams]);

  return <div className="mm mm-page">
    <PageBanner id="collections-title" eyebrow="The Collections" title={<>Looks for Every <em>Ceremony</em></>} lead="Each look is a starting point. Every piece is tailored to you." />
    <CollectionCarousel onOpen={openLook} />
    <LookGrid filter={filter} onFilter={setFilter} onOpen={openLook} />
    <StylingOrbit />
    <CraftSection />
    <LookDialog outfit={open} onClose={closeLook} />
  </div>;
}
