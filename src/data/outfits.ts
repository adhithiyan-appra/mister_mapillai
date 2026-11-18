import type { ImageKey } from './images';

export type Occasion = 'muhurtham' | 'reception' | 'themed' | 'family';
export type OutfitFilter = 'all' | Occasion;
export type DetailKind = 'clothing' | 'accessory' | 'footwear' | 'finish';

export interface OutfitDetail {
  kind: DetailKind;
  label: string;
  value: string;
}

export interface Outfit {
  /** Stable identifier shared by the carousel, details panel, ceremony data and booking link. */
  id: string;
  occasions: readonly Occasion[];
  title: string;
  price: string;
  description: string;
  image: ImageKey;
  thumbnail: ImageKey;
  /** Garment name and one-line summary used by the catalogue and home preview. */
  garment: string;
  summary: string;
  /** Rows in display order; `kind` groups them as clothing, accessories, footwear and finish. */
  details: readonly OutfitDetail[];
}

export const occasionLabels: Record<Occasion, string> = {
  muhurtham: 'Muhurtham',
  reception: 'Reception',
  themed: 'Engagement / Sangeet',
  family: "Groom's Family",
};

export const outfitFilters: readonly { id: OutfitFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'muhurtham', label: 'Muhurtham' },
  { id: 'reception', label: 'Reception' },
  { id: 'themed', label: 'Engagement / Sangeet' },
  { id: 'family', label: "Groom's Family" },
];

type Row = [kind: DetailKind, label: string, value: string];
const rows = (...items: Row[]): OutfitDetail[] => items.map(([kind, label, value]) => ({ kind, label, value }));

/** All 13 original collection looks in original reference order. */
export const outfits: readonly Outfit[] = [
  {
    id: 'temple-gold-heritage',
    image: 'sherwani',
    thumbnail: 'sherwani-sm',
    occasions: ['muhurtham'],
    title: 'Temple Gold Heritage',
    price: 'From ₹42,000',
    description: 'Zari silk shirt · Pattu veshti · Angavastram · Chain styling',
    garment: 'Muhurtham',
    summary: 'Zari silk shirt · Pattu veshti · Angavastram · Chain styling',
    details: rows(
      ['clothing', 'Shirt', 'Zari silk shirt'],
      ['clothing', 'Veshti', 'Pattu veshti'],
      ['accessory', 'Layer', 'Angavastram'],
      ['finish', 'Styling', 'Chain styling'],
    ),
  },
  {
    id: 'ivory-pattu-classic',
    image: 'silk-veshti',
    thumbnail: 'silk-veshti-sm',
    occasions: ['muhurtham'],
    title: 'Ivory Pattu Classic',
    price: 'From ₹28,000',
    description: 'Silk shirt · Gold-border veshti · Angavastram · Mojari',
    garment: 'Muhurtham',
    summary: 'Silk shirt · Gold-border veshti · Angavastram · Mojari',
    details: rows(
      ['clothing', 'Shirt', 'Pure silk shirt'],
      ['clothing', 'Veshti', 'Gold-border pattu veshti'],
      ['accessory', 'Layer', 'Matching angavastram'],
      ['footwear', 'Footwear', 'Mojari'],
    ),
  },
  {
    id: 'navy-bandhgala',
    image: 'bandhgala-navy',
    thumbnail: 'bandhgala-navy-sm',
    occasions: ['themed'],
    title: 'Embroidered Bandhgala',
    price: '',
    description: 'Navy with gold aari for the engagement',
    garment: 'Navy bandhgala',
    summary: 'Gold aari work for the engagement',
    details: rows(
      ['clothing', 'Top', 'Navy bandhgala with gold aari on chest and cuffs'],
      ['clothing', 'Bottom', 'Matching navy trousers, flat front'],
      ['accessory', 'Layer', 'Gold silk pocket square'],
      ['footwear', 'Footwear', 'Brown leather loafers'],
      ['finish', 'Finish', 'Temple-motif gold buttons'],
    ),
  },
  {
    id: 'royal-maroon-bandhgala',
    image: 'bandhgala-black',
    thumbnail: 'bandhgala-black-sm',
    occasions: ['reception'],
    title: 'Royal Maroon Bandhgala',
    price: 'From ₹55,000',
    description: 'Hand-work coat · Trousers · Pocket square · Brogues',
    garment: 'Reception',
    summary: 'Hand-work coat · Trousers · Pocket square · Brogues',
    details: rows(
      ['clothing', 'Coat', 'Hand-work designer coat'],
      ['clothing', 'Bottom', 'Tailored trousers'],
      ['accessory', 'Finish', 'Pocket square'],
      ['footwear', 'Footwear', 'Brogues'],
    ),
  },
  {
    id: 'ivory-double-breasted',
    image: 'double-breasted',
    thumbnail: 'double-breasted-sm',
    occasions: ['reception'],
    title: 'Wedding Reception Look',
    price: '',
    description: 'Ivory double-breasted suit for the stage',
    garment: 'Double-breasted suit',
    summary: 'Peak lapels for the reception',
    details: rows(
      ['clothing', 'Jacket', 'Ivory double-breasted suit, peak lapel'],
      ['clothing', 'Shirt', 'White cotton shirt, spread collar'],
      ['accessory', 'Watch', 'Classic leather strap'],
      ['footwear', 'Footwear', 'Chestnut brown oxfords'],
      ['finish', 'Finish', 'Champagne tie and pocket square'],
    ),
  },
  {
    id: 'midnight-embroidered-suit',
    image: 'tuxedo',
    thumbnail: 'tuxedo-sm',
    occasions: ['reception'],
    title: 'Midnight Embroidered Suit',
    price: 'From ₹68,000',
    description: 'Embroidered jacket · Shirt · Trousers · Brooch · Shoes',
    garment: 'Reception',
    summary: 'Embroidered jacket · Shirt · Trousers · Brooch · Shoes',
    details: rows(
      ['clothing', 'Jacket', 'Embroidered jacket'],
      ['clothing', 'Shirt', 'Tailored shirt'],
      ['clothing', 'Bottom', 'Tailored trousers'],
      ['accessory', 'Finish', 'Brooch'],
      ['footwear', 'Footwear', 'Shoes'],
    ),
  },
  {
    id: 'best-men-edit',
    image: 'jodhpuri',
    thumbnail: 'jodhpuri-sm',
    occasions: ['family'],
    title: 'Best Men Edit',
    price: 'From ₹15,000 / person',
    description: 'Colour-coordinated kurtas or suits for friends',
    garment: "Groom's Family",
    summary: 'Colour-coordinated kurtas or suits for friends',
    details: rows(
      ['clothing', 'Outfits', 'Colour-coordinated kurtas or suits for friends'],
    ),
  },
  {
    id: 'sangeet-pastel-kurta',
    image: 'indowestern',
    thumbnail: 'indowestern-sm',
    occasions: ['themed'],
    title: 'Sangeet Pastel Kurta',
    price: 'From ₹22,000',
    description: 'Kurta · Nehru jacket · Trousers · Stole',
    garment: 'Engagement / Sangeet',
    summary: 'Kurta · Nehru jacket · Trousers · Stole',
    details: rows(
      ['clothing', 'Kurta', 'Pastel kurta'],
      ['clothing', 'Jacket', 'Nehru jacket'],
      ['clothing', 'Bottom', 'Trousers'],
      ['accessory', 'Layer', 'Stole'],
    ),
  },
  {
    id: 'sand-three-piece',
    image: 'threepiece',
    thumbnail: 'threepiece-sm',
    occasions: ['reception', 'family'],
    title: 'Three-Piece Suit',
    price: '',
    description: 'Jacket, waistcoat and trousers in sand beige',
    garment: 'Three-piece suit',
    summary: 'Jacket, waistcoat and trousers',
    details: rows(
      ['clothing', 'Jacket', 'Sand beige suit jacket'],
      ['clothing', 'Waistcoat', 'Matching single-breasted waistcoat'],
      ['clothing', 'Bottom', 'Flat-front trousers'],
      ['footwear', 'Footwear', 'Brown leather oxfords'],
      ['finish', 'Finish', 'Ivory lapel flower'],
    ),
  },
  {
    id: 'grooms-family-coordinated',
    image: 'ceremonial-shirt',
    thumbnail: 'ceremonial-shirt-sm',
    occasions: ['family'],
    title: "Groom's Family Coordinated",
    price: 'From ₹12,000 / person',
    description: 'Matching shirts & veshtis for father & brothers',
    garment: "Groom's Family",
    summary: 'Matching shirts & veshtis for father & brothers',
    details: rows(
      ['clothing', 'Shirts', 'Matching shirts for father & brothers'],
      ['clothing', 'Veshtis', 'Coordinated silk veshtis'],
    ),
  },
  {
    id: 'signature-embroidered-shirt',
    image: 'signature-shirt',
    thumbnail: 'signature-shirt-sm',
    occasions: ['family', 'themed'],
    title: 'Signature Embroidered Shirt',
    price: '',
    description: 'Hand-worked zari and aari',
    garment: 'Signature embroidered shirt',
    summary: 'Hand-worked zari and aari',
    details: rows(
      ['clothing', 'Shirt', 'Ivory shirt with gold zari on the shoulders'],
      ['clothing', 'Bottom', 'Dark brown trousers'],
      ['accessory', 'Belt', 'Brown leather belt'],
      ['footwear', 'Footwear', 'Brown leather loafers'],
      ['finish', 'Finish', 'Rolled cuffs for an easy evening look'],
    ),
  },
  {
    id: 'engagement-ivory-jacket',
    image: 'bandhgala-ivory',
    thumbnail: 'bandhgala-ivory-sm',
    occasions: ['themed'],
    title: 'Engagement Ivory Jacket',
    price: 'From ₹34,000',
    description: 'Bandhgala jacket · Shirt · Trousers · Loafers',
    garment: 'Engagement / Sangeet',
    summary: 'Bandhgala jacket · Shirt · Trousers · Loafers',
    details: rows(
      ['clothing', 'Jacket', 'Bandhgala jacket'],
      ['clothing', 'Shirt', 'Tailored shirt'],
      ['clothing', 'Bottom', 'Trousers'],
      ['footwear', 'Footwear', 'Loafers'],
    ),
  },
  {
    id: 'charcoal-waistcoat-suit',
    image: 'charcoal-suit',
    thumbnail: 'charcoal-suit-sm',
    occasions: ['family'],
    title: 'Charcoal Waistcoat Suit',
    price: '',
    description: 'A charcoal three-piece for day events',
    garment: 'Waistcoat suit',
    summary: 'Charcoal three-piece for day events',
    details: rows(
      ['clothing', 'Jacket', 'Charcoal single-breasted jacket'],
      ['clothing', 'Waistcoat', 'Double-breasted charcoal waistcoat'],
      ['clothing', 'Shirt', 'Pale blue shirt with a black tie'],
      ['footwear', 'Footwear', 'Black leather loafers'],
      ['finish', 'Finish', 'White pocket square'],
    ),
  },
];

const legacyLookAliases: Record<string, string> = {
  'silk-shirt-veshti': 'ivory-pattu-classic',
  'champagne-sherwani': 'temple-gold-heritage',
  'black-royal-bandhgala': 'royal-maroon-bandhgala',
  'midnight-tuxedo': 'midnight-embroidered-suit',
  'blush-indo-western': 'sangeet-pastel-kurta',
  'ivory-bandhgala': 'engagement-ivory-jacket',
  'jodhpuri-suit': 'best-men-edit',
  'ceremonial-shirt': 'grooms-family-coordinated',
};

export function outfitsFor(filter: OutfitFilter): readonly Outfit[] {
  return filter === 'all' ? outfits : outfits.filter(outfit => outfit.occasions.includes(filter));
}

export function outfitById(id: string | null | undefined): Outfit | undefined {
  if (!id) return undefined;
  const resolved = legacyLookAliases[id] ?? id;
  return outfits.find(outfit => outfit.id === resolved);
}

export function isOutfitFilter(value: string): value is OutfitFilter {
  return outfitFilters.some(filter => filter.id === value);
}

/** Occasion label(s) for display in cards and carousel. */
export function occasionText(outfit: Outfit): string {
  return outfit.occasions.map(occasion => occasionLabels[occasion]).join(' · ');
}
