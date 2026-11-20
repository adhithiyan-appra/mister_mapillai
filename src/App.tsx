import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { JSX } from 'react';
import { AnimationProvider, useAnimationController } from './components/animations/AnimationProvider';
import { ImageLoading } from './components/animations/ImageLoading';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { CursorGlow, PageCurtain, WhatsAppButton } from './components/layout/SiteEffects';
import { SiteLoader } from './components/layout/SiteLoader';
import { applyPageSeo } from './utils/seo';
import { restoreScroll } from './utils/scrollRestore';
import { useReveal } from './hooks/useReveal';
import {
  AboutPage,
  CeremoniesPage,
  CollectionsPage,
  ContactPage,
  HomePage,
  NotFoundPage,
  TrackOrderPage,
} from './pages';
import { RouterProvider, scrollToHash, useRouter } from './router';
import type { RoutePath } from './router';

const pages: Record<RoutePath, () => JSX.Element> = {
  '/': HomePage,
  '/collections': CollectionsPage,
  '/about': AboutPage,
  '/ceremonies': CeremoniesPage,
  '/contact': ContactPage,
  '/track-order': TrackOrderPage,
};

function Site() {
  const { path, hash } = useRouter();
  const controller = useAnimationController();
  const main = useRef<HTMLElement>(null);
  const Page = path ? pages[path] : NotFoundPage;
  const routeKey = path ?? 'missing';
  // The loader belongs to the first page of the visit; on the home page it waits for the hero frames.
  const [firstPath] = useState(path);
  useReveal(main, routeKey);
  useLayoutEffect(() => {
    // A reload or a back/forward step returns to where that history entry was scrolled; anything else starts at the
    // top (or the #hash), as before.
    if (!restoreScroll()) scrollToHash(hash);
    controller.reset();
  }, [path, hash, controller]);
  useEffect(() => { applyPageSeo(path); }, [path]);
  return <>
    <Header />
    <CursorGlow />
    <main className="page" key={routeKey} ref={main}><Page /></main>
    <ImageLoading routeKey={routeKey} />
    <Footer />
    <WhatsAppButton />
    <PageCurtain routeKey={routeKey} />
    <SiteLoader waitForHero={firstPath === '/'} />
  </>;
}

export default function App() {
  return <RouterProvider><AnimationProvider><Site /></AnimationProvider></RouterProvider>;
}
