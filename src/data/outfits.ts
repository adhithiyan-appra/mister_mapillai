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

/** All 18 collection looks arranged so categories alternate evenly across the grid. */
export const outfits: readonly Outfit[] = [
  {
    id: 'traditional-muhurtham-collection',
    image: 'traditional-muhurtham-collection',
    thumbnail: 'traditional-muhurtham-collection-sm',
    occasions: ['muhurtham'],
    title: 'Traditional Muhurtham Collection',
    price: '',
    description: 'Cream embroidered shirt · Gold peacock and floral embroidery · Gold-border angavastram · Wide gold-border veshti · Gold brooch',
    garment: 'Muhurtham',
    summary: 'Cream embroidered shirt · Gold peacock and floral embroidery · Gold-border angavastram · Wide gold-border veshti · Gold brooch',
    details: rows(
      ['clothing', 'Shirt', 'Cream shirt with gold peacock and floral embroidery across the shoulder, placket, sleeves and cuffs'],
      ['clothing', 'Veshti', 'Ivory veshti with a wide gold border'],
      ['accessory', 'Angavastram', 'Cream angavastram with a gold border, draped over the shoulder'],
      ['finish', 'Finish', 'Gold brooch on the placket, thin gold chain and bracelet; worn barefoot'],
    ),
  },
  {
    id: 'grand-tamil-reception',
    image: 'grand-tamil-reception',
    thumbnail: 'grand-tamil-reception-sm',
    occasions: ['reception'],
    title: 'Grand Tamil Reception',
    price: '',
    description: 'Maroon velvet-style bandhgala · Gold floral and temple embroidery · Brooch and pocket square · Matching trousers · Brown oxfords',
    garment: 'Reception',
    summary: 'Maroon velvet-style bandhgala · Gold floral and temple embroidery · Brooch and pocket square · Matching trousers · Brown oxfords',
    details: rows(
      ['clothing', 'Bandhgala', 'Maroon velvet-style bandhgala with gold floral embroidery across the chest and shoulder, embroidered collar and cuffs, and temple and elephant motifs at the hem'],
      ['clothing', 'Bottom', 'Matching maroon tailored trousers'],
      ['accessory', 'Accessories', 'Gold brooch with hanging drops, gold pocket square and a metal-bracelet wristwatch'],
      ['footwear', 'Footwear', 'Dark brown leather lace-up oxfords'],
      ['finish', 'Finish', 'Gold-tone buttons down the front'],
    ),
  },
  {
    id: 'best-men-edit',
    image: 'jodhpuri',
    thumbnail: 'jodhpuri-sm',
    occasions: ['family'],
    title: 'Best Men Edit',
    price: 'From ₹15,000 / person',
    description: 'Ivory embroidered Jodhpuri-style jacket · Stand collar with button front · Pistachio-green trousers · Embroidered ivory mojaris',
    garment: "Groom's Family",
    summary: 'Ivory embroidered Jodhpuri-style jacket · Stand collar with button front · Pistachio-green trousers · Embroidered ivory mojaris',
    details: rows(
      ['clothing', 'Jacket', 'Ivory Jodhpuri-style jacket with all-over embroidery, a stand collar and a full button front'],
      ['clothing', 'Bottom', 'Pistachio-green tailored trousers'],
      ['footwear', 'Footwear', 'Embroidered ivory mojaris'],
    ),
  },
  {
    id: 'royal-maroon-bandhgala',
    image: 'bandhgala-black',
    thumbnail: 'bandhgala-black-sm',
    occasions: ['reception'],
    title: 'Royal Maroon Bandhgala',
    price: 'From ₹55,000',
    description: 'Black bandhgala · Gold vine embroidery on collar, shoulders, cuffs and hem · Patterned pocket square · Black trousers · Black loafers',
    garment: 'Reception',
    summary: 'Black bandhgala · Gold vine embroidery on collar, shoulders, cuffs and hem · Patterned pocket square · Black trousers · Black loafers',
    details: rows(
      ['clothing', 'Bandhgala', 'Black bandhgala with gold vine embroidery on the collar, shoulders, cuffs and hem'],
      ['clothing', 'Bottom', 'Black tailored trousers'],
      ['accessory', 'Finish', 'Patterned pocket square'],
      ['footwear', 'Footwear', 'Black leather loafers'],
      ['finish', 'Finish', 'Gold-tone buttons down the front'],
    ),
  },
  {
    id: 'elegant-nalangu-collection',
    image: 'elegant-nalangu-collection',
    thumbnail: 'elegant-nalangu-collection-sm',
    occasions: ['family'],
    title: 'Elegant Nalangu Collection',
    price: '',
    description: 'Cream kurta · Fine floral embroidery at neck, chest and cuffs · Gold-border angavastram · Gold-border veshti · Brown leather sandals',
    garment: 'Nalangu / Family Ceremony',
    summary: 'Cream kurta · Fine floral embroidery at neck, chest and cuffs · Gold-border angavastram · Gold-border veshti · Brown leather sandals',
    details: rows(
      ['clothing', 'Kurta', 'Cream kurta with a short stand collar and fine floral embroidery and scattered motifs along the neck placket, chest and cuffs'],
      ['clothing', 'Veshti', 'Ivory veshti with a broad gold border'],
      ['accessory', 'Angavastram', 'Cream angavastram with a gold border and a leather-strap wristwatch'],
      ['footwear', 'Footwear', 'Brown leather sandals'],
    ),
  },
  {
    id: 'royal-engagement-sangeet',
    image: 'royal-engagement-sangeet',
    thumbnail: 'royal-engagement-sangeet-sm',
    occasions: ['themed'],
    title: 'Royal Engagement & Sangeet',
    price: '',
    description: 'Royal navy asymmetric bandhgala · Gold floral and paisley embroidery · Gold pocket square · Matching trousers · Embroidered loafers',
    garment: 'Engagement / Sangeet',
    summary: 'Royal navy asymmetric bandhgala · Gold floral and paisley embroidery · Gold pocket square · Matching trousers · Embroidered loafers',
    details: rows(
      ['clothing', 'Bandhgala', 'Navy asymmetric bandhgala with a diagonal front closure and gold floral and paisley embroidery along the collar, front panel, hem and cuffs'],
      ['clothing', 'Bottom', 'Matching navy tailored trousers'],
      ['accessory', 'Accessories', 'Gold-tone buttons and a folded gold pocket square'],
      ['footwear', 'Footwear', 'Navy slip-on loafers embroidered in gold'],
    ),
  },
  {
    id: 'temple-gold-heritage',
    image: 'sherwani',
    thumbnail: 'sherwani-sm',
    occasions: ['muhurtham'],
    title: 'Temple Gold Heritage',
    price: 'From ₹42,000',
    description: 'Champagne-gold sherwani · Gold embroidery across shoulders and sleeves · Ivory trousers · Brown leather loafers',
    garment: 'Muhurtham',
    summary: 'Champagne-gold sherwani · Gold embroidery across shoulders and sleeves · Ivory trousers · Brown leather loafers',
    details: rows(
      ['clothing', 'Sherwani', 'Long champagne-gold sherwani with a stand collar and gold embroidery across the shoulders and sleeves'],
      ['clothing', 'Bottom', 'Ivory tailored trousers'],
      ['accessory', 'Watch', 'Classic wristwatch'],
      ['footwear', 'Footwear', 'Brown leather loafers'],
    ),
  },
  {
    id: 'sangeet-pastel-kurta',
    image: 'indowestern',
    thumbnail: 'indowestern-sm',
    occasions: ['themed'],
    title: 'Sangeet Pastel Kurta',
    price: 'From ₹22,000',
    description: 'Blush-pink sherwani · All-over floral pattern · Draped matching stole · Pink trousers · Cream mojaris',
    garment: 'Engagement / Sangeet',
    summary: 'Blush-pink sherwani · All-over floral pattern · Draped matching stole · Pink trousers · Cream mojaris',
    details: rows(
      ['clothing', 'Sherwani', 'Blush-pink long sherwani with an all-over floral pattern and a side button closure'],
      ['clothing', 'Bottom', 'Blush-pink fitted trousers'],
      ['accessory', 'Layer', 'Matching stole draped over one shoulder'],
      ['footwear', 'Footwear', 'Cream mojaris'],
    ),
  },
  {
    id: 'charcoal-waistcoat-suit',
    image: 'charcoal-suit',
    thumbnail: 'charcoal-suit-sm',
    occasions: ['family'],
    title: 'Charcoal Waistcoat Suit',
    price: '',
    description: 'Tailored charcoal three-piece suit · Matching waistcoat · Pale-blue shirt and black tie · White pocket square · Black loafers',
    garment: 'Waistcoat suit',
    summary: 'Charcoal three-piece with waistcoat, tie and pocket square',
    details: rows(
      ['clothing', 'Jacket', 'Charcoal single-breasted jacket'],
      ['clothing', 'Waistcoat', 'Double-breasted charcoal waistcoat'],
      ['clothing', 'Shirt', 'Pale blue shirt with a black tie'],
      ['footwear', 'Footwear', 'Black leather loafers'],
      ['finish', 'Finish', 'White pocket square'],
    ),
  },
  {
    id: 'engagement-ivory-jacket',
    image: 'bandhgala-ivory',
    thumbnail: 'bandhgala-ivory-sm',
    occasions: ['themed'],
    title: 'Engagement Ivory Jacket',
    price: 'From ₹34,000',
    description: 'Ivory floral-patterned bandhgala jacket · Embroidered chest crest · Cream kurta · Cream trousers · Embroidered mojaris',
    garment: 'Engagement / Sangeet',
    summary: 'Ivory floral-patterned bandhgala jacket · Embroidered chest crest · Cream kurta · Cream trousers · Embroidered mojaris',
    details: rows(
      ['clothing', 'Jacket', 'Ivory bandhgala jacket with a tone-on-tone floral pattern, bronze-gold buttons and an embroidered crest at the chest pocket'],
      ['clothing', 'Kurta', 'Cream kurta layered underneath'],
      ['clothing', 'Bottom', 'Cream tailored trousers'],
      ['footwear', 'Footwear', 'Embroidered ivory mojaris'],
    ),
  },
  {
    id: 'sand-three-piece',
    image: 'threepiece',
    thumbnail: 'threepiece-sm',
    occasions: ['reception', 'family'],
    title: 'Three-Piece Suit',
    price: '',
    description: 'Sand-beige three-piece suit · Matching waistcoat · Open-collar white shirt · White lapel flower · Brown leather oxfords',
    garment: 'Three-piece suit',
    summary: 'Sand-beige jacket, waistcoat and trousers',
    details: rows(
      ['clothing', 'Jacket', 'Sand beige suit jacket'],
      ['clothing', 'Waistcoat', 'Matching single-breasted waistcoat'],
      ['clothing', 'Shirt', 'White shirt worn open at the collar'],
      ['clothing', 'Bottom', 'Flat-front trousers'],
      ['footwear', 'Footwear', 'Brown leather oxfords'],
      ['finish', 'Finish', 'White lapel flower and pocket square'],
    ),
  },
  {
    id: 'traditional-mapillai-azhaippu',
    image: 'traditional-mapillai-azhaippu',
    thumbnail: 'traditional-mapillai-azhaippu-sm',
    occasions: ['muhurtham'],
    title: 'Traditional Mapillai Azhaippu',
    price: '',
    description: 'Champagne shirt with gold paisley embroidery · Gold-border angavastram · Gold-border veshti · Brown leather sandals',
    garment: 'Mapillai Azhaippu',
    summary: 'Champagne shirt with gold paisley embroidery · Gold-border angavastram · Gold-border veshti · Brown leather sandals',
    details: rows(
      ['clothing', 'Shirt', 'Champagne shirt with gold paisley and floral embroidery at the shoulder, placket, collar and cuffs, sleeves folded back'],
      ['clothing', 'Veshti', 'Cream veshti with a gold border'],
      ['accessory', 'Angavastram', 'Cream angavastram with a gold border, thin gold chain and a leather-strap wristwatch'],
      ['footwear', 'Footwear', 'Brown leather sandals'],
    ),
  },
  {
    id: 'grooms-family-coordinated',
    image: 'ceremonial-shirt',
    thumbnail: 'ceremonial-shirt-sm',
    occasions: ['family'],
    title: "Groom's Family Coordinated",
    price: 'From ₹12,000 / person',
    description: 'Cream shirt with gold front embroidery · Embroidered collar and cuffs · Black tailored trousers · Ornate belt buckle · Black oxfords',
    garment: "Groom's Family",
    summary: 'Cream shirt with gold front embroidery · Embroidered collar and cuffs · Black tailored trousers · Ornate belt buckle · Black oxfords',
    details: rows(
      ['clothing', 'Shirt', 'Cream shirt with gold embroidery down the front placket and across the collar, shoulders and cuffs'],
      ['clothing', 'Bottom', 'Black tailored trousers'],
      ['accessory', 'Belt', 'Black belt with an ornate gold-tone buckle'],
      ['footwear', 'Footwear', 'Black leather oxfords'],
    ),
  },
  {
    id: 'navy-bandhgala',
    image: 'bandhgala-navy',
    thumbnail: 'bandhgala-navy-sm',
    occasions: ['themed'],
    title: 'Embroidered Bandhgala',
    price: '',
    description: 'Navy bandhgala · Gold and pale-blue floral embroidery · Gold pocket square · Matching trousers · Brown loafers',
    garment: 'Navy bandhgala',
    summary: 'Gold and pale-blue floral embroidery for the engagement',
    details: rows(
      ['clothing', 'Top', 'Navy bandhgala with gold and pale-blue floral embroidery across the collar, shoulders, sleeves and hem'],
      ['clothing', 'Bottom', 'Matching navy trousers'],
      ['accessory', 'Layer', 'Gold pocket square'],
      ['footwear', 'Footwear', 'Brown leather loafers'],
      ['finish', 'Finish', 'Gold-tone buttons down the front'],
    ),
  },
  {
    id: 'ivory-double-breasted',
    image: 'double-breasted',
    thumbnail: 'double-breasted-sm',
    occasions: ['reception'],
    title: 'Wedding Reception Look',
    price: '',
    description: 'Ivory double-breasted suit · Gold buttons · Champagne tie and pocket square · Brown leather oxfords',
    garment: 'Double-breasted suit',
    summary: 'Peak lapels for the reception',
    details: rows(
      ['clothing', 'Jacket', 'Ivory double-breasted suit, peak lapel, gold buttons'],
      ['clothing', 'Shirt', 'White shirt, spread collar'],
      ['accessory', 'Watch', 'Silver-tone wristwatch'],
      ['footwear', 'Footwear', 'Chestnut brown oxfords'],
      ['finish', 'Finish', 'Champagne tie and pocket square'],
    ),
  },
  {
    id: 'ivory-pattu-classic',
    image: 'silk-veshti',
    thumbnail: 'silk-veshti-sm',
    occasions: ['muhurtham'],
    title: 'Ivory Pattu Classic',
    price: 'From ₹28,000',
    description: 'Lustrous gold shirt · Ivory veshti with gold border · Brown leather sandals · Wristwatch',
    garment: 'Muhurtham',
    summary: 'Lustrous gold shirt · Ivory veshti with gold border · Brown leather sandals · Wristwatch',
    details: rows(
      ['clothing', 'Shirt', 'Lustrous champagne-gold shirt with a spread collar'],
      ['clothing', 'Veshti', 'Ivory veshti with a gold border'],
      ['accessory', 'Watch', 'Classic wristwatch'],
      ['footwear', 'Footwear', 'Brown leather sandals'],
    ),
  },
  {
    id: 'midnight-embroidered-suit',
    image: 'tuxedo',
    thumbnail: 'tuxedo-sm',
    occasions: ['reception'],
    title: 'Midnight Embroidered Suit',
    price: 'From ₹68,000',
    description: 'Navy three-piece suit · Matching waistcoat · White shirt with dotted tie · Floral lapel pin with chain · Brown oxfords',
    garment: 'Reception',
    summary: 'Navy three-piece suit · Matching waistcoat · White shirt with dotted tie · Floral lapel pin with chain · Brown oxfords',
    details: rows(
      ['clothing', 'Jacket', 'Navy tailored jacket'],
      ['clothing', 'Waistcoat', 'Matching navy waistcoat'],
      ['clothing', 'Shirt', 'White shirt with a navy dotted tie'],
      ['clothing', 'Bottom', 'Matching navy trousers'],
      ['accessory', 'Finish', 'Floral lapel pin with chain, pocket square and wristwatch'],
      ['footwear', 'Footwear', 'Brown leather oxfords'],
    ),
  },
  {
    id: 'signature-embroidered-shirt',
    image: 'signature-shirt',
    thumbnail: 'signature-shirt-sm',
    occasions: ['family', 'themed'],
    title: 'Signature Embroidered Shirt',
    price: '',
    description: 'Cream shirt · Gold embroidery across shoulders and sleeves · Rolled cuffs · Brown pleated trousers · Brown leather lace-ups',
    garment: 'Signature embroidered shirt',
    summary: 'Cream shirt · Gold embroidery across shoulders and sleeves · Rolled cuffs · Brown pleated trousers · Brown leather lace-ups',
    details: rows(
      ['clothing', 'Shirt', 'Cream shirt with gold embroidery across the shoulders and upper sleeves'],
      ['clothing', 'Bottom', 'Dark brown pleated trousers'],
      ['accessory', 'Belt', 'Brown leather belt'],
      ['footwear', 'Footwear', 'Dark brown leather lace-up shoes'],
      ['finish', 'Finish', 'Rolled cuffs for an easy evening look'],
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
