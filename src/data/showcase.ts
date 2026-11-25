import type { ImageKey } from './images';
import { outfitById } from './outfits';
import type { Outfit, OutfitFilter } from './outfits';

export interface SiteStat {
  value: number;
  decimals?: number;
  suffix?: string;
  label: string;
}

export const siteStats: readonly SiteStat[] = [
  { value: 1200, suffix: '+', label: 'Grooms Styled' },
  { value: 12, suffix: '+', label: 'Years of Craft' },
  { value: 100, suffix: '%', label: 'Hand-Finished' },
  { value: 4.9, decimals: 1, suffix: '★', label: 'Google Rating' },
];

export const marqueeItems: readonly string[] = [
  'Muhurtham',
  'Reception',
  'Engagement',
  'Sangeet',
  'Haldi',
  'Head to Toe',
];

export interface OccasionCardItem {
  key: OutfitFilter;
  name: string;
  subtitle: string;
  image: ImageKey;
  imagePosition?: string;
  included: readonly string[];
}

export const occasionCards: readonly OccasionCardItem[] = [
  {
    key: 'muhurtham',
    name: 'Muhurtham',
    subtitle: 'The sacred moment',
    image: 'traditional-muhurtham-collection',
    imagePosition: 'center top',
    included: [
      'Pure silk shirt',
      'Gold-border pattu veshti',
      'Angavastram',
      'Kolhapuri / mojari',
      'Rudraksha & chain styling',
    ],
  },
  {
    key: 'reception',
    name: 'Reception',
    subtitle: 'Your grand evening',
    image: 'tuxedo',
    imagePosition: 'center top',
    included: [
      'Hand-work designer coat suit',
      'Tailored shirt & trousers',
      'Pocket square & brooch',
      'Italian leather shoes',
      'Watch & cufflink styling',
    ],
  },
  {
    key: 'themed',
    name: 'Themed Occasions',
    subtitle: 'Engagement · Sangeet · Haldi',
    image: 'indowestern',
    included: [
      'Theme-matched kurta / jacket',
      'Custom colour palette',
      'Stole or dupatta',
      'Matching footwear',
      'Family coordination',
    ],
  },
];

export const comparisonPanels = {
  usual: {
    title: 'The Usual Way',
    points: [
      '6–8 shops for one outfit',
      'Mismatched shirt, veshti & footwear',
      'Ready-made fits',
      'Last-minute alterations',
    ],
  },
  mapillai: {
    title: 'The Mapillai Way',
    points: [
      'One studio, every ritual',
      'Colour-matched head to toe',
      'Tailored to your measurements',
      'Delivered early, tracked online',
    ],
  },
} as const;

export interface HomeJourneyStep {
  title: string;
  description: string;
}

export const homeJourneySteps: readonly HomeJourneyStep[] = [
  { title: 'Consultation', description: 'Your events, theme & personal style' },
  { title: 'Design', description: 'Sketches, fabrics & colour palette' },
  { title: 'Measurement', description: '30+ precise points by our master tailor' },
  { title: 'Stitching & Trials', description: 'Hand-crafted, refined over 2 fittings' },
  { title: 'Wedding Ready', description: 'Delivered 7 days before your big day' },
];

export interface GalleryItem {
  image: ImageKey;
  title: string;
  caption: string;
  span?: 'tall' | 'wide';
  outfit?: Outfit;
  href?: string;
}

function look(id: string, image: ImageKey, span?: GalleryItem['span']): GalleryItem {
  const outfit = outfitById(id);
  if (!outfit) throw new Error(`Unknown outfit in gallery: ${id}`);
  return { image, title: outfit.title, caption: outfit.description, span, outfit };
}

// 9 gallery images matching the reference GALLERY spans:
// [['groom5','tall'],['groom4',''],['wedding','wide'],['suit',''],['groom6','tall'],['groom1',''],['groom2',''],['couple','wide'],['groom3','']]
export const galleryItems: readonly GalleryItem[] = [
  look('ivory-pattu-classic', 'silk-veshti', 'tall'),
  look('midnight-embroidered-suit', 'tuxedo'),
  { image: 'happy-grooms-hero', title: 'Mr. Gowtham', caption: 'Royal Procession: Muhurtham silk shirt and veshti', span: 'wide' },
  look('engagement-ivory-jacket', 'bandhgala-ivory'),
  look('best-men-edit', 'jodhpuri', 'tall'),
  look('temple-gold-heritage', 'sherwani'),
  look('royal-maroon-bandhgala', 'bandhgala-black'),
  { image: 'db-wide', title: 'Reception Tailoring', caption: 'Tailored ivory double-breasted look for the evening stage', span: 'wide', outfit: outfitById('royal-maroon-bandhgala') },
  look('sangeet-pastel-kurta', 'indowestern'),
];

export interface AccessoryAddon {
  icon: string;
  name: string;
}

export const accessoryAddons: readonly AccessoryAddon[] = [
  { icon: 'brooch', name: 'Brooch' },
  { icon: 'watch', name: 'Watch' },
  { icon: 'pocket-square', name: 'Pocket Sq.' },
  { icon: 'mala', name: 'Mala' },
  { icon: 'cufflinks', name: 'Cufflinks' },
  { icon: 'footwear', name: 'Footwear' },
  { icon: 'turban', name: "Groom's Trouser" },
  { icon: 'stole', name: 'Embroidered Shirt' },
];

export const craftHighlights: readonly string[] = [
  'Pure Kanchipuram & Banarasi silks',
  'Real zari and hand embroidery',
  'Imported suiting from Italian mills',
  'Two trial fittings, every order',
];
