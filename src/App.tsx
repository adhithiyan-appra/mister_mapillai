import { useEffect, useLayoutEffect } from 'react';
import type { JSX } from 'react';
import { AnimationProvider, useAnimationController } from './components/animations/AnimationProvider';
import { ImageLoading } from './components/animations/ImageLoading';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { pageMeta } from './data/navigation';
import { CollectionsPage } from './pages/CollectionsPage';
import { ContactPage } from './pages/ContactPage';
import { HappyGroomsPage } from './pages/HappyGroomsPage';
import { HomePage } from './pages/HomePage';
import { NotFoundPage } from './pages/NotFoundPage';
import { RouterProvider, scrollToHash, useRouter } from './router';
import type { RoutePath } from './router';

const pages: Record<RoutePath, () => JSX.Element> = {
  '/': HomePage,
  '/collections': CollectionsPage,
  '/happy-grooms': HappyGroomsPage,
  '/contact': ContactPage,
};

function Site() {
  const { path, hash } = useRouter();
  const controller = useAnimationController();
  const Page = path ? pages[path] : NotFoundPage;
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
    <main className="page" key={path ?? 'missing'}><Page /></main>
    <ImageLoading routeKey={path ?? 'missing'} />
    <Footer />
  </>;
}

export default function App() {
  return <RouterProvider><AnimationProvider><Site /></AnimationProvider></RouterProvider>;
}
