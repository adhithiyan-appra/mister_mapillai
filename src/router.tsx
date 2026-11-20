import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { pageMeta } from './data/navigation';
import { expectTraversal, leavingForNewLocation } from './utils/scrollRestore';

export type RoutePath = keyof typeof pageMeta;

interface RouterLocation {
  pathname: string;
  path: RoutePath | null;
  search: string;
  hash: string;
}

export interface NavigateOptions {
  /** Replace the current history entry instead of adding one (filters, closing a dialog). */
  replace?: boolean;
}

interface RouterValue extends RouterLocation {
  navigate: (href: string, options?: NavigateOptions) => void;
}

const RouterContext = createContext<RouterValue | null>(null);

function canonicalPath(pathname: string) {
  return pathname.replace(/\/+$/, '') || '/';
}

const legacyRedirects: Record<string, RoutePath> = {
  // Page names used by the design template.
  '/book': '/contact',
  '/order': '/contact',
  '/track': '/track-order',
};

function readLocation(): RouterLocation {
  const pathname = canonicalPath(window.location.pathname);
  const resolved = legacyRedirects[pathname] ?? pathname;
  const path = Object.hasOwn(pageMeta, resolved) ? resolved as RoutePath : null;
  return { pathname: resolved, path, search: window.location.search, hash: window.location.hash };
}

export function scrollToHash(hash: string) {
  const root = document.documentElement;
  const previous = root.style.scrollBehavior;
  root.style.scrollBehavior = 'auto';
  const id = hash.replace(/^#/, '');
  const node = id ? document.getElementById(id) : null;
  if (node) {
    const bleed = node.classList.contains('scene');
    const top = node.getBoundingClientRect().top + window.scrollY - (bleed ? 0 : 90);
    window.scrollTo(0, Math.max(0, top));
  } else window.scrollTo(0, 0);
  root.style.scrollBehavior = previous;
}

export function RouterProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useState(readLocation);

  useEffect(() => {
    if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
    const canonical = canonicalPath(window.location.pathname);
    const resolved = legacyRedirects[canonical] ?? canonical;
    if (canonical !== window.location.pathname || resolved !== canonical) {
      history.replaceState(null, '', resolved + window.location.search + window.location.hash);
      setLocation(readLocation());
    }
    // Back/forward: the entry stepped to may have a saved scroll position (utils/scrollRestore.ts).
    const onPop = () => { expectTraversal(); setLocation(readLocation()); };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  function navigate(href: string, { replace = false }: NavigateOptions = {}) {
    const url = new URL(href, window.location.href);
    if (url.origin !== window.location.origin) {
      window.location.assign(url.href);
      return;
    }
    const requested = canonicalPath(url.pathname);
    const next = (legacyRedirects[requested] ?? requested) + url.search + url.hash;
    const current = canonicalPath(window.location.pathname) + window.location.search + window.location.hash;
    if (next !== current) {
      // A new location: remember where this entry was scrolled; the new one starts fresh (top or its #hash).
      leavingForNewLocation();
      if (replace) history.replaceState(history.state, '', next);
      else history.pushState(null, '', next);
    }
    setLocation(readLocation());
    if (next === current) scrollToHash(url.hash);
  }

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest('a') : null;
      if (!anchor || anchor.hasAttribute('download')) return;
      if (anchor.target && anchor.target !== '_self') return;
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('mailto:') || href.startsWith('tel:')) return;
      let url: URL;
      try { url = new URL(href, window.location.href); }
      catch { return; }
      if (url.origin !== window.location.origin) return;
      event.preventDefault();
      navigate(url.pathname + url.search + url.hash);
    };
    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, []);

  return <RouterContext value={{ ...location, navigate }}>{children}</RouterContext>;
}

export function useRouter() {
  const router = useContext(RouterContext);
  if (!router) throw new Error('Router hooks require RouterProvider.');
  return router;
}
