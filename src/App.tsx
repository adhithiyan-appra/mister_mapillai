import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { JSX } from 'react';
import { AnimationProvider, useAnimationController } from './components/animations/AnimationProvider';
import { ImageLoading } from './components/animations/ImageLoading';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { CursorGlow, PageCurtain, WhatsAppButton } from './components/layout/SiteEffects';
import { SiteLoader } from './components/layout/SiteLoader';
import { pageMeta } from './data/navigation';
import { useReveal } from './hooks/useReveal';
import { AboutPage } from './pages/AboutPage';
import { CeremoniesPage } from './pages/CeremoniesPage';
import { CollectionsPage } from './pages/CollectionsPage';
import { ContactPage } from './pages/ContactPage';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { TrackOrderPage } from './pages/TrackOrderPage';
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
    scrollToHash(hash);
    controller.reset();
  }, [path, hash, controller]);
  useEffect(() => {
    const entry = path ? pageMeta[path] : {
      title: 'Page not found · Mister Mapillai',
      description: 'This address is not part of the Mister Mapillai house.',
    };
    document.title = entry.title;
    document.querySelector('meta[name="description"]')?.setAttribute('content', entry.description);
  }, [path]);
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
