import type { ImageKey } from './images';

/**
 * Brand copy already published on the site, collected in one place so the 3D
 * About scene and the template pages read the same words.
 */
export const brandTagline = 'Bespoke for life’s greatest moments';
export const brandCategory = 'Groom and occasion wear for men';
export const brandRole = 'The groom’s designer';

export const brandIntro = {
  title: 'We dress the groom and the men of the family, for every function, top to bottom',
  description: 'Sherwanis, bandhgalas, suits, silk shirts and veshtis, designed to your ceremony and its theme, then styled with the belt, footwear and finishing pieces that complete it.',
} as const;

export const brandApproach = 'We design the whole look, not just the outfit.';
export const brandPromise = 'Groom and occasion wear for men, from the first message to the last photograph.';

export interface BrandPillar {
  title: string;
  description: string;
  image: ImageKey;
  alt: string;
}

export const brandPillars: readonly BrandPillar[] = [
  { title: 'Design', description: 'A theme, moodboard and palette built around your wedding story.', image: 'moodboard', alt: 'Royal Procession moodboard' },
  { title: 'Craft', description: 'Aari, zari and bead work by hand on premium silks.', image: 'place-1', alt: 'Zari and bead embroidery on a silk sleeve' },
  { title: 'Style', description: 'The full look, head to toe: belt, shoes, stole and buttons.', image: 'bandhgala-black', alt: 'Groom in a black embroidered bandhgala' },
];

export interface BrandReason {
  label: 'Why' | 'What' | 'How';
  title: string;
  description: string;
}

/**
 * The About page's Why / What / How cards. Composed only from the copy above,
 * so no company history, location or figure is introduced.
 */
export const brandReasons: readonly BrandReason[] = [
  { label: 'Why', title: 'Why We Exist', description: `${brandApproach} ${brandTagline}.` },
  { label: 'What', title: 'What We Do', description: brandIntro.description },
  {
    label: 'How',
    title: 'How We Work',
    description: brandPillars.map(pillar => `${pillar.title}: ${pillar.description.charAt(0).toLowerCase()}${pillar.description.slice(1)}`).join(' '),
  },
];
