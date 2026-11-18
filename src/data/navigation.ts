export const siteNav = [
  { href: '/', label: 'Home' },
  { href: '/collections', label: 'Collections' },
  { href: '/about', label: 'About Us' },
  { href: '/track-order', label: 'Track Order' },
] as const;

/** Secondary destinations: linked from the footer and from related sections. */
export const exploreNav = [
  { href: '/ceremonies', label: 'Ceremony Styling' },
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

export const pageMeta = {
  '/': {
    title: 'Mister Mapillai',
    description: 'Mister Mapillai designs bespoke groom and occasion wear for men: sherwanis, bandhgalas, suits, silk shirts and veshtis, styled head to toe for every ceremony.',
  },
  '/collections': {
    title: 'Collections · Mister Mapillai',
    description: 'Sherwanis, bandhgalas, Indo-western suits, three-piece suits, silk shirts and veshtis, styled head to toe for every ceremony.',
  },
  '/about': {
    title: 'About Us · Mister Mapillai',
    description: 'The groom’s designer: how Mister Mapillai designs, crafts and styles every look, from the first message to the last photograph.',
  },
  '/ceremonies': {
    title: 'Ceremony Styling · Mister Mapillai',
    description: 'Walk the ceremony corridor: every function before and after Mister Mapillai, then see one look styled head to toe.',
  },
  '/contact': {
    title: 'Book Your Look · Mister Mapillai',
    description: 'Book a fitting consultation with Mister Mapillai.',
  },
  '/track-order': {
    title: 'Track Order · Mister Mapillai',
    description: 'Ask your Mister Mapillai stylist for the status of your order.',
  },
} as const;
