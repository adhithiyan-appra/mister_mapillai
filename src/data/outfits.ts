import type { ImageKey } from './images';

export type Occasion = 'wedding' | 'reception' | 'engagement' | 'sangeet-mehendi' | 'family-functions';
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
  wedding: 'Wedding',
  reception: 'Reception',
  engagement: 'Engagement',
  'sangeet-mehendi': 'Sangeet and Mehendi',
  'family-functions': 'Family functions',
};

export const outfitFilters: readonly { id: OutfitFilter; label: string }[] = [
  { id: 'all', label: 'All looks' },
  ...(Object.keys(occasionLabels) as Occasion[]).map(id => ({ id, label: occasionLabels[id] })),
];

type Row = [kind: DetailKind, label: string, value: string];
const rows = (...items: Row[]): OutfitDetail[] => items.map(([kind, label, value]) => ({ kind, label, value }));

/** Looks, specifications and occasions follow the collection reference (collection.html), in its order. */
export const outfits: readonly Outfit[] = [
  {
    id: 'champagne-sherwani', image: 'sherwani', thumbnail: 'sherwani-sm', occasions: ['wedding'],
    title: 'Ivory gold sherwani', description: 'Jacquard sherwani for the groom’s welcome',
    garment: 'Sherwani', summary: 'For the groom’s welcome and baraat',
    details: rows(
      ['clothing', 'Top', 'Knee-length champagne gold jacquard sherwani'],
      ['clothing', 'Bottom', 'Ivory churidar, slim at the ankle'],
      ['accessory', 'Layer', 'Silk stole in a soft contrast tone'],
      ['footwear', 'Footwear', 'Embroidered ivory mojaris'],
      ['finish', 'Finish', 'Collar brooch and pocket kerchief'],
    ),
  },
  {
    id: 'silk-shirt-veshti', image: 'silk-veshti', thumbnail: 'silk-veshti-sm', occasions: ['wedding'],
    title: 'Traditional veshti edit', description: 'Silk shirt and zari veshti for the muhurtham',
    garment: 'Silk shirt and veshti', summary: 'For the muhurtham',
    details: rows(
      ['clothing', 'Shirt', 'Golden pure silk shirt with temple-inspired zari'],
      ['clothing', 'Veshti', 'Silk veshti with a broad gold zari border'],
      ['accessory', 'Layer', 'Matching angavastram'],
      ['accessory', 'Belt', 'Brushed brass veshti belt'],
      ['footwear', 'Footwear', 'Tan leather sandals'],
    ),
  },
  {
    id: 'navy-bandhgala', image: 'bandhgala-navy', thumbnail: 'bandhgala-navy-sm', occasions: ['engagement'],
    title: 'Embroidered bandhgala', description: 'Navy with gold aari for the engagement',
    garment: 'Navy bandhgala', summary: 'Gold aari work for the engagement',
    details: rows(
      ['clothing', 'Top', 'Navy bandhgala with gold aari on chest and cuffs'],
      ['clothing', 'Bottom', 'Matching navy trousers, flat front'],
      ['accessory', 'Layer', 'Gold silk pocket square'],
      ['footwear', 'Footwear', 'Brown leather loafers'],
      ['finish', 'Finish', 'Temple-motif gold buttons'],
    ),
  },
  {
    id: 'black-royal-bandhgala', image: 'bandhgala-black', thumbnail: 'bandhgala-black-sm', occasions: ['engagement', 'reception'],
    title: 'Royal bandhgala', description: 'Black with gold embroidery for evening events',
    garment: 'Royal bandhgala', summary: 'Embroidered, with a mandarin collar',
    details: rows(
      ['clothing', 'Top', 'Black bandhgala, gold embroidery at collar, cuffs and hem'],
      ['clothing', 'Bottom', 'Black tapered trousers'],
      ['accessory', 'Layer', 'Embroidered pocket square'],
      ['footwear', 'Footwear', 'Black leather loafers'],
      ['finish', 'Finish', 'Antique gold buttons'],
    ),
  },
  {
    id: 'ivory-double-breasted', image: 'double-breasted', thumbnail: 'double-breasted-sm', occasions: ['reception'],
    title: 'Wedding reception look', description: 'Ivory double-breasted suit for the stage',
    garment: 'Double-breasted suit', summary: 'Peak lapels for the reception',
    details: rows(
      ['clothing', 'Jacket', 'Ivory double-breasted suit, peak lapel'],
      ['clothing', 'Shirt', 'White cotton shirt, spread collar'],
      ['accessory', 'Watch', 'Classic leather strap'],
      ['footwear', 'Footwear', 'Chestnut brown oxfords'],
      ['finish', 'Finish', 'Champagne tie and pocket square'],
    ),
  },
  {
    id: 'midnight-tuxedo', image: 'tuxedo', thumbnail: 'tuxedo-sm', occasions: ['reception'],
    title: 'Classic tuxedo', description: 'Midnight navy with satin lapels',
    garment: 'Classic tuxedo', summary: 'Satin lapels for evening events',
    details: rows(
      ['clothing', 'Jacket', 'Midnight navy tuxedo, satin lapel'],
      ['clothing', 'Shirt', 'White dress shirt, French cuffs'],
      ['clothing', 'Bottom', 'Tuxedo trousers with a satin side stripe'],
      ['footwear', 'Footwear', 'Black patent oxfords'],
      ['finish', 'Finish', 'Pocket square, cufflinks and lapel pin'],
    ),
  },
  {
    id: 'jodhpuri-suit', image: 'jodhpuri', thumbnail: 'jodhpuri-sm', occasions: ['engagement', 'sangeet-mehendi', 'family-functions'],
    title: 'Jodhpuri suit', description: 'Ivory jacquard, structured and regal',
    garment: 'Jodhpuri suit', summary: 'Structured, regal, quietly ornate',
    details: rows(
      ['clothing', 'Top', 'Ivory jacquard jodhpuri jacket'],
      ['clothing', 'Bottom', 'Sage green trousers'],
      ['finish', 'Detail', 'Self-fabric buttons in a column'],
      ['footwear', 'Footwear', 'Embroidered ivory mojaris'],
      ['finish', 'Finish', 'Clean mandarin collar'],
    ),
  },
  {
    id: 'blush-indo-western', image: 'indowestern', thumbnail: 'indowestern-sm', occasions: ['sangeet-mehendi'],
    title: 'Indo-western suit', description: 'Blush jacquard with a drape',
    garment: 'Indo-western suit', summary: 'Drapes and asymmetric cuts',
    details: rows(
      ['clothing', 'Top', 'Blush jacquard Indo-western, asymmetric closure'],
      ['clothing', 'Bottom', 'Matching slim pants'],
      ['accessory', 'Layer', 'Printed drape in a deeper rose'],
      ['footwear', 'Footwear', 'Ivory mojaris'],
      ['finish', 'Finish', 'Pearl-head buttons'],
    ),
  },
  {
    id: 'sand-three-piece', image: 'threepiece', thumbnail: 'threepiece-sm', occasions: ['reception', 'family-functions'],
    title: 'Three-piece suit', description: 'Jacket, waistcoat and trousers in sand beige',
    garment: 'Three-piece suit', summary: 'Jacket, waistcoat and trousers',
    details: rows(
      ['clothing', 'Jacket', 'Sand beige suit jacket'],
      ['clothing', 'Waistcoat', 'Matching single-breasted waistcoat'],
      ['clothing', 'Bottom', 'Flat-front trousers'],
      ['footwear', 'Footwear', 'Brown leather oxfords'],
      ['finish', 'Finish', 'Ivory lapel flower'],
    ),
  },
  {
    id: 'ceremonial-shirt', image: 'ceremonial-shirt', thumbnail: 'ceremonial-shirt-sm', occasions: ['family-functions'],
    title: 'Ceremonial shirt', description: 'Embroidered shirt for family functions',
    garment: 'Ceremonial shirt', summary: 'Embroidered shirts for family functions',
    details: rows(
      ['clothing', 'Shirt', 'Ivory shirt with zari vines across chest and shoulders'],
      ['accessory', 'Belt', 'Temple-motif gold buckle'],
      ['accessory', 'Watch', 'Black dial, leather strap'],
      ['clothing', 'Bottom', 'Tapered black trousers'],
      ['footwear', 'Footwear', 'Black leather oxfords'],
    ),
  },
  {
    id: 'signature-embroidered-shirt', image: 'signature-shirt', thumbnail: 'signature-shirt-sm', occasions: ['family-functions', 'sangeet-mehendi'],
    title: 'Signature embroidered shirt', description: 'Hand-worked zari and aari',
    garment: 'Signature embroidered shirt', summary: 'Hand-worked zari and aari',
    details: rows(
      ['clothing', 'Shirt', 'Ivory shirt with gold zari on the shoulders'],
      ['clothing', 'Bottom', 'Dark brown trousers'],
      ['accessory', 'Belt', 'Brown leather belt'],
      ['footwear', 'Footwear', 'Brown leather loafers'],
      ['finish', 'Finish', 'Rolled cuffs for an easy evening look'],
    ),
  },
  {
    id: 'ivory-bandhgala', image: 'bandhgala-ivory', thumbnail: 'bandhgala-ivory-sm', occasions: ['wedding', 'engagement'],
    title: 'Ivory bandhgala', description: 'Classic, with a crest at the chest',
    garment: 'Ivory bandhgala', summary: 'Classic, with a crest at the chest',
    details: rows(
      ['clothing', 'Top', 'Ivory bandhgala with an embroidered crest'],
      ['clothing', 'Bottom', 'Ivory churidar'],
      ['accessory', 'Layer', 'Optional silk stole'],
      ['footwear', 'Footwear', 'Ivory mojaris'],
      ['finish', 'Finish', 'Self-covered buttons'],
    ),
  },
  // Not in the reference, but an existing outfit in the collection's assets, so
  // it keeps its place in All looks (and Family functions).
  {
    id: 'charcoal-waistcoat-suit', image: 'charcoal-suit', thumbnail: 'charcoal-suit-sm', occasions: ['family-functions'],
    title: 'Charcoal waistcoat suit', description: 'A charcoal three-piece for day events',
    garment: 'Waistcoat suit', summary: 'Charcoal three-piece for day events',
    details: rows(
      ['clothing', 'Jacket', 'Charcoal single-breasted jacket'],
      ['clothing', 'Waistcoat', 'Double-breasted charcoal waistcoat'],
      ['clothing', 'Shirt', 'Pale blue shirt with a black tie'],
      ['footwear', 'Footwear', 'Black leather loafers'],
      ['finish', 'Finish', 'White pocket square'],
    ),
  },
];

export function outfitsFor(filter: OutfitFilter): readonly Outfit[] {
  return filter === 'all' ? outfits : outfits.filter(outfit => outfit.occasions.includes(filter));
}

export function outfitById(id: string | null | undefined): Outfit | undefined {
  return id ? outfits.find(outfit => outfit.id === id) : undefined;
}

export function isOutfitFilter(value: string): value is OutfitFilter {
  return outfitFilters.some(filter => filter.id === value);
}

/** "Engagement · Reception" for looks that suit more than one occasion. */
export function occasionText(outfit: Outfit): string {
  return outfit.occasions.map(occasion => occasionLabels[occasion]).join(' · ');
}
