export const siteNav = [
  { href: '/', label: 'Home' },
  { href: '/collections', label: 'Collection' },
  { href: '/happy-grooms', label: 'Happy grooms' },
  { href: '/contact', label: 'Contact' },
] as const;

export const fittingHref = '/contact';

export const pageMeta = {
  '/': {
    title: 'Mister Mapillai',
    description: 'Mister Mapillai designs bespoke groom and occasion wear for men: sherwanis, bandhgalas, suits, silk shirts and veshtis, styled head to toe for every ceremony.',
  },
  '/collections': {
    title: 'Collections · Mister Mapillai',
    description: 'Sherwanis, bandhgalas, Indo-western suits, three-piece suits, silk shirts, veshtis, and ceremony transformations.',
  },
  '/happy-grooms': {
    title: 'Happy Grooms · Mister Mapillai',
    description: 'Mr. Gowtham’s Royal Procession: the moodboard, motifs, sketch, bespoke hand embroidery, and materials behind his Devatan shirt.',
  },
  '/contact': {
    title: 'Contact | Mister Mapillai',
    description: 'Book a fitting consultation with Mister Mapillai.',
  },
} as const;
