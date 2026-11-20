import seo from './seo.json';

export const siteNav = [
  { href: '/', label: 'Home' },
  { href: '/collections', label: 'Collections' },
  { href: '/about', label: 'About Us' },
  { href: '/track-order', label: 'Track Order' },
] as const;

export const fittingHref = '/contact';

/** Booking link, optionally with a look from the collection preselected. */
export function bookingHref(lookId?: string): string {
  return lookId ? `${fittingHref}?look=${encodeURIComponent(lookId)}` : fittingHref;
}

/** Collection link that opens a look's details. */
export function lookHref(lookId: string): string {
  return `/collections?look=${encodeURIComponent(lookId)}`;
}

export const pageMeta = seo.pages;

