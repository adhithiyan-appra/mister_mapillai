export interface OurWorkImage {
  id: string;
  filename: string;
  src: string;
  title: string;
  caption: string;
  /** Initial fallback ratio before img.onLoad reports natural dimensions. */
  aspectRatio: number;
  width?: number;
  height?: number;
  objectPosition: string;
  preferTall?: boolean;
}

export interface PlacedGalleryItem extends OurWorkImage {
  colStart: number;
  rowStart: number;
  colSpan: number;
  rowSpan: number;
}

export interface PackedGallery {
  items: PlacedGalleryItem[];
  totalRows: number;
}

interface CuratedWorkMeta {
  title: string;
  caption: string;
  width: number;
  height: number;
  objectPosition: string;
  preferTall?: boolean;
}

const VALID_IMAGE_PATTERN = /\.(jpe?g|png|webp|avif)$/i;

/**
 * Curated outfit titles and subject focal points for inspected files in
 * src/assets/our_works. Any newly added images in that folder are still
 * picked up dynamically and formatted automatically.
 */
const CURATED_WORKS: Record<string, CuratedWorkMeta> = {
  'image.png': {
    title: 'Maroon Hand-Beaded Indo-Western',
    caption: 'Bespoke deep maroon draped jacket with hand-beaded lapel detailing and tailored trousers',
    width: 1024,
    height: 1536,
    objectPosition: '50% 12%',
    preferTall: true,
  },
  'image1.png': {
    title: 'Ivory Muhurtham Silk Ensemble',
    caption: 'Pure ivory raw-silk ceremonial shirt paired with gold-border pattu veshti and angavastram',
    width: 1024,
    height: 1536,
    objectPosition: '50% 10%',
  },
  'image2.png': {
    title: 'Midnight Crystal Bandhgala',
    caption: 'Sculpted midnight-navy bandhgala jacket accented with hand-worked crystal shoulders and sleeves',
    width: 1672,
    height: 941,
    objectPosition: '46% 14%',
  },
  'imagee.png': {
    title: 'Navy Double-Breasted Tailoring',
    caption: 'Sharp navy double-breasted blazer styled with crisp white shirt and ivory tailored trousers',
    width: 1122,
    height: 1402,
    objectPosition: '52% 14%',
  },
  'imagei.png': {
    title: 'Espresso Embellished Three-Piece',
    caption: 'Rich espresso shawl-lapel three-piece reception suit with tonal crystal embroidery',
    width: 1024,
    height: 1536,
    objectPosition: '54% 12%',
    preferTall: true,
  },
};

const ourWorksModules = import.meta.glob<string>(
  '../../assets/our_works/**/*.{jpg,jpeg,png,webp,avif,JPG,JPEG,PNG,WEBP,AVIF}',
  { eager: true, import: 'default' },
);

function formatFallbackTitle(filename: string, index: number): string {
  const stem = filename.replace(/\.[^.]+$/, '');
  if (/^(img|image|dsc|pxl|photo|whatsapp|screenshot)[-_ ]*\d*$/i.test(stem)) {
    return `Real Groom Look ${index + 1}`;
  }
  const words = stem
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1));
  return words.length ? words.join(' ') : `Real Groom Look ${index + 1}`;
}

export function loadOurWorksImages(): OurWorkImage[] {
  const entries = Object.entries(ourWorksModules)
    .filter(([path, url]) => VALID_IMAGE_PATTERN.test(path) && typeof url === 'string' && url.length > 0)
    .sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

  return entries.map(([path, src], index) => {
    const filename = path.split('/').pop() ?? `look-${index + 1}`;
    const meta = CURATED_WORKS[filename.toLowerCase()];
    const aspectRatio = meta ? meta.width / meta.height : 0.75;
    return {
      id: path,
      filename,
      src,
      title: meta?.title ?? formatFallbackTitle(filename, index),
      caption: meta?.caption ?? 'Custom groom wear tailored at Mister Mapillai',
      aspectRatio,
      width: meta?.width,
      height: meta?.height,
      objectPosition: meta?.objectPosition ?? (aspectRatio >= 1.2 ? '50% 24%' : '50% 14%'),
      preferTall: meta?.preferTall,
    };
  });
}

export function getResponsiveColumns(viewportWidth: number, itemCount: number): 2 | 3 | 4 | 5 {
  if (viewportWidth >= 1440 && itemCount >= 8) return 5;
  if (viewportWidth >= 1024) return 4;
  if (viewportWidth >= 768) return 3;
  return 2;
}

interface SlotSpec {
  colOffset: number;
  rowOffset: number;
  colSpan: number;
  rowSpan: number;
  role: 'L' | 'T' | 'P'; // Landscape, Tall portrait (1x2 or 2x2), Standard portrait (1x1)
}

interface BandTemplate {
  dL: number;
  dP: number;
  rows: number;
  weight: number; // Lower is preferred
  slots: readonly SlotSpec[];
}

export const BANDS_BY_COLS: Record<2 | 3 | 4 | 5, readonly BandTemplate[]> = {
  4: [
    // Hero 5-item editorial block: two tall portraits flanking wide landscape + two compact portraits
    {
      dL: 1, dP: 4, rows: 2, weight: 1,
      slots: [
        { colOffset: 0, rowOffset: 0, colSpan: 1, rowSpan: 2, role: 'T' },
        { colOffset: 1, rowOffset: 0, colSpan: 2, rowSpan: 1, role: 'L' },
        { colOffset: 3, rowOffset: 0, colSpan: 1, rowSpan: 2, role: 'T' },
        { colOffset: 1, rowOffset: 1, colSpan: 1, rowSpan: 1, role: 'P' },
        { colOffset: 2, rowOffset: 1, colSpan: 1, rowSpan: 1, role: 'P' },
      ],
    },
    {
      dL: 1, dP: 2, rows: 1, weight: 2,
      slots: [
        { colOffset: 0, rowOffset: 0, colSpan: 1, rowSpan: 1, role: 'P' },
        { colOffset: 1, rowOffset: 0, colSpan: 2, rowSpan: 1, role: 'L' },
        { colOffset: 3, rowOffset: 0, colSpan: 1, rowSpan: 1, role: 'P' },
      ],
    },
    {
      dL: 0, dP: 6, rows: 2, weight: 2,
      slots: [
        { colOffset: 0, rowOffset: 0, colSpan: 1, rowSpan: 2, role: 'T' },
        { colOffset: 1, rowOffset: 0, colSpan: 1, rowSpan: 1, role: 'P' },
        { colOffset: 2, rowOffset: 0, colSpan: 1, rowSpan: 1, role: 'P' },
        { colOffset: 3, rowOffset: 0, colSpan: 1, rowSpan: 2, role: 'T' },
        { colOffset: 1, rowOffset: 1, colSpan: 1, rowSpan: 1, role: 'P' },
        { colOffset: 2, rowOffset: 1, colSpan: 1, rowSpan: 1, role: 'P' },
      ],
    },
    {
      dL: 0, dP: 5, rows: 2, weight: 3,
      slots: [
        { colOffset: 0, rowOffset: 0, colSpan: 1, rowSpan: 2, role: 'T' },
        { colOffset: 1, rowOffset: 0, colSpan: 1, rowSpan: 2, role: 'T' },
        { colOffset: 2, rowOffset: 0, colSpan: 1, rowSpan: 1, role: 'P' },
        { colOffset: 3, rowOffset: 0, colSpan: 1, rowSpan: 2, role: 'T' },
        { colOffset: 2, rowOffset: 1, colSpan: 1, rowSpan: 1, role: 'P' },
      ],
    },
    {
      dL: 0, dP: 4, rows: 1, weight: 3,
      slots: [
        { colOffset: 0, rowOffset: 0, colSpan: 1, rowSpan: 1, role: 'P' },
        { colOffset: 1, rowOffset: 0, colSpan: 1, rowSpan: 1, role: 'P' },
        { colOffset: 2, rowOffset: 0, colSpan: 1, rowSpan: 1, role: 'P' },
        { colOffset: 3, rowOffset: 0, colSpan: 1, rowSpan: 1, role: 'P' },
      ],
    },
    {
      dL: 1, dP: 5, rows: 2, weight: 3,
      slots: [
        { colOffset: 0, rowOffset: 0, colSpan: 2, rowSpan: 1, role: 'L' },
        { colOffset: 2, rowOffset: 0, colSpan: 1, rowSpan: 2, role: 'T' },
        { colOffset: 3, rowOffset: 0, colSpan: 1, rowSpan: 1, role: 'P' },
        { colOffset: 0, rowOffset: 1, colSpan: 1, rowSpan: 1, role: 'P' },
        { colOffset: 1, rowOffset: 1, colSpan: 1, rowSpan: 1, role: 'P' },
        { colOffset: 3, rowOffset: 1, colSpan: 1, rowSpan: 1, role: 'P' },
      ],
    },
    {
      dL: 1, dP: 3, rows: 2, weight: 4,
      slots: [
        { colOffset: 0, rowOffset: 0, colSpan: 2, rowSpan: 2, role: 'T' },
        { colOffset: 2, rowOffset: 0, colSpan: 2, rowSpan: 1, role: 'L' },
        { colOffset: 2, rowOffset: 1, colSpan: 1, rowSpan: 1, role: 'P' },
        { colOffset: 3, rowOffset: 1, colSpan: 1, rowSpan: 1, role: 'P' },
      ],
    },
    {
      dL: 0, dP: 7, rows: 2, weight: 4,
      slots: [
        { colOffset: 0, rowOffset: 0, colSpan: 1, rowSpan: 2, role: 'T' },
        { colOffset: 1, rowOffset: 0, colSpan: 1, rowSpan: 1, role: 'P' },
        { colOffset: 2, rowOffset: 0, colSpan: 1, rowSpan: 1, role: 'P' },
        { colOffset: 3, rowOffset: 0, colSpan: 1, rowSpan: 1, role: 'P' },
        { colOffset: 1, rowOffset: 1, colSpan: 1, rowSpan: 1, role: 'P' },
        { colOffset: 2, rowOffset: 1, colSpan: 1, rowSpan: 1, role: 'P' },
        { colOffset: 3, rowOffset: 1, colSpan: 1, rowSpan: 1, role: 'P' },
      ],
    },
    {
      dL: 2, dP: 2, rows: 2, weight: 4,
      slots: [
        { colOffset: 0, rowOffset: 0, colSpan: 1, rowSpan: 2, role: 'T' },
        { colOffset: 1, rowOffset: 0, colSpan: 2, rowSpan: 1, role: 'L' },
        { colOffset: 3, rowOffset: 0, colSpan: 1, rowSpan: 2, role: 'T' },
        { colOffset: 1, rowOffset: 1, colSpan: 2, rowSpan: 1, role: 'L' },
      ],
    },
    {
      dL: 2, dP: 0, rows: 1, weight: 5,
      slots: [
        { colOffset: 0, rowOffset: 0, colSpan: 2, rowSpan: 1, role: 'L' },
        { colOffset: 2, rowOffset: 0, colSpan: 2, rowSpan: 1, role: 'L' },
      ],
    },
    {
      dL: 2, dP: 1, rows: 2, weight: 6,
      slots: [
        { colOffset: 0, rowOffset: 0, colSpan: 2, rowSpan: 1, role: 'L' },
        { colOffset: 2, rowOffset: 0, colSpan: 2, rowSpan: 2, role: 'T' },
        { colOffset: 0, rowOffset: 1, colSpan: 2, rowSpan: 1, role: 'L' },
      ],
    },
    {
      dL: 0, dP: 3, rows: 2, weight: 6,
      slots: [
        { colOffset: 0, rowOffset: 0, colSpan: 2, rowSpan: 2, role: 'T' },
        { colOffset: 2, rowOffset: 0, colSpan: 1, rowSpan: 2, role: 'T' },
        { colOffset: 3, rowOffset: 0, colSpan: 1, rowSpan: 2, role: 'T' },
      ],
    },
    {
      dL: 0, dP: 2, rows: 2, weight: 8,
      slots: [
        { colOffset: 0, rowOffset: 0, colSpan: 2, rowSpan: 2, role: 'T' },
        { colOffset: 2, rowOffset: 0, colSpan: 2, rowSpan: 2, role: 'T' },
      ],
    },
    {
      dL: 1, dP: 1, rows: 1, weight: 9,
      slots: [
        { colOffset: 0, rowOffset: 0, colSpan: 3, rowSpan: 1, role: 'L' },
        { colOffset: 3, rowOffset: 0, colSpan: 1, rowSpan: 1, role: 'P' },
      ],
    },
    {
      dL: 1, dP: 0, rows: 1, weight: 12,
      slots: [{ colOffset: 0, rowOffset: 0, colSpan: 4, rowSpan: 1, role: 'L' }],
    },
    {
      dL: 0, dP: 1, rows: 2, weight: 18,
      slots: [{ colOffset: 0, rowOffset: 0, colSpan: 4, rowSpan: 2, role: 'T' }],
    },
  ],

  5: [
    {
      dL: 1, dP: 6, rows: 2, weight: 1,
      slots: [
        { colOffset: 0, rowOffset: 0, colSpan: 1, rowSpan: 2, role: 'T' },
        { colOffset: 1, rowOffset: 0, colSpan: 2, rowSpan: 1, role: 'L' },
        { colOffset: 3, rowOffset: 0, colSpan: 1, rowSpan: 1, role: 'P' },
        { colOffset: 4, rowOffset: 0, colSpan: 1, rowSpan: 2, role: 'T' },
        { colOffset: 1, rowOffset: 1, colSpan: 1, rowSpan: 1, role: 'P' },
        { colOffset: 2, rowOffset: 1, colSpan: 1, rowSpan: 1, role: 'P' },
        { colOffset: 3, rowOffset: 1, colSpan: 1, rowSpan: 1, role: 'P' },
      ],
    },
    {
      dL: 1, dP: 5, rows: 2, weight: 2,
      slots: [
        { colOffset: 0, rowOffset: 0, colSpan: 1, rowSpan: 2, role: 'T' },
        { colOffset: 1, rowOffset: 0, colSpan: 2, rowSpan: 1, role: 'L' },
        { colOffset: 3, rowOffset: 0, colSpan: 1, rowSpan: 2, role: 'T' },
        { colOffset: 4, rowOffset: 0, colSpan: 1, rowSpan: 2, role: 'T' },
        { colOffset: 1, rowOffset: 1, colSpan: 1, rowSpan: 1, role: 'P' },
        { colOffset: 2, rowOffset: 1, colSpan: 1, rowSpan: 1, role: 'P' },
      ],
    },
    {
      dL: 1, dP: 4, rows: 2, weight: 2,
      slots: [
        { colOffset: 0, rowOffset: 0, colSpan: 2, rowSpan: 2, role: 'T' },
        { colOffset: 2, rowOffset: 0, colSpan: 2, rowSpan: 1, role: 'L' },
        { colOffset: 4, rowOffset: 0, colSpan: 1, rowSpan: 2, role: 'T' },
        { colOffset: 2, rowOffset: 1, colSpan: 1, rowSpan: 1, role: 'P' },
        { colOffset: 3, rowOffset: 1, colSpan: 1, rowSpan: 1, role: 'P' },
      ],
    },
    {
      dL: 1, dP: 3, rows: 1, weight: 2,
      slots: [
        { colOffset: 0, rowOffset: 0, colSpan: 1, rowSpan: 1, role: 'P' },
        { colOffset: 1, rowOffset: 0, colSpan: 2, rowSpan: 1, role: 'L' },
        { colOffset: 3, rowOffset: 0, colSpan: 1, rowSpan: 1, role: 'P' },
        { colOffset: 4, rowOffset: 0, colSpan: 1, rowSpan: 1, role: 'P' },
      ],
    },
    {
      dL: 0, dP: 8, rows: 2, weight: 2,
      slots: [
        { colOffset: 0, rowOffset: 0, colSpan: 1, rowSpan: 2, role: 'T' },
        { colOffset: 1, rowOffset: 0, colSpan: 1, rowSpan: 1, role: 'P' },
        { colOffset: 2, rowOffset: 0, colSpan: 1, rowSpan: 1, role: 'P' },
        { colOffset: 3, rowOffset: 0, colSpan: 1, rowSpan: 1, role: 'P' },
        { colOffset: 4, rowOffset: 0, colSpan: 1, rowSpan: 2, role: 'T' },
        { colOffset: 1, rowOffset: 1, colSpan: 1, rowSpan: 1, role: 'P' },
        { colOffset: 2, rowOffset: 1, colSpan: 1, rowSpan: 1, role: 'P' },
        { colOffset: 3, rowOffset: 1, colSpan: 1, rowSpan: 1, role: 'P' },
      ],
    },
    {
      dL: 2, dP: 1, rows: 1, weight: 3,
      slots: [
        { colOffset: 0, rowOffset: 0, colSpan: 2, rowSpan: 1, role: 'L' },
        { colOffset: 2, rowOffset: 0, colSpan: 1, rowSpan: 1, role: 'P' },
        { colOffset: 3, rowOffset: 0, colSpan: 2, rowSpan: 1, role: 'L' },
      ],
    },
    {
      dL: 0, dP: 5, rows: 1, weight: 3,
      slots: [
        { colOffset: 0, rowOffset: 0, colSpan: 1, rowSpan: 1, role: 'P' },
        { colOffset: 1, rowOffset: 0, colSpan: 1, rowSpan: 1, role: 'P' },
        { colOffset: 2, rowOffset: 0, colSpan: 1, rowSpan: 1, role: 'P' },
        { colOffset: 3, rowOffset: 0, colSpan: 1, rowSpan: 1, role: 'P' },
        { colOffset: 4, rowOffset: 0, colSpan: 1, rowSpan: 1, role: 'P' },
      ],
    },
    {
      dL: 0, dP: 7, rows: 2, weight: 4,
      slots: [
        { colOffset: 0, rowOffset: 0, colSpan: 1, rowSpan: 2, role: 'T' },
        { colOffset: 1, rowOffset: 0, colSpan: 1, rowSpan: 1, role: 'P' },
        { colOffset: 2, rowOffset: 0, colSpan: 1, rowSpan: 2, role: 'T' },
        { colOffset: 3, rowOffset: 0, colSpan: 1, rowSpan: 1, role: 'P' },
        { colOffset: 4, rowOffset: 0, colSpan: 1, rowSpan: 2, role: 'T' },
        { colOffset: 1, rowOffset: 1, colSpan: 1, rowSpan: 1, role: 'P' },
        { colOffset: 3, rowOffset: 1, colSpan: 1, rowSpan: 1, role: 'P' },
      ],
    },
    {
      dL: 0, dP: 9, rows: 2, weight: 4,
      slots: [
        { colOffset: 0, rowOffset: 0, colSpan: 1, rowSpan: 2, role: 'T' },
        { colOffset: 1, rowOffset: 0, colSpan: 1, rowSpan: 1, role: 'P' },
        { colOffset: 2, rowOffset: 0, colSpan: 1, rowSpan: 1, role: 'P' },
        { colOffset: 3, rowOffset: 0, colSpan: 1, rowSpan: 1, role: 'P' },
        { colOffset: 4, rowOffset: 0, colSpan: 1, rowSpan: 1, role: 'P' },
        { colOffset: 1, rowOffset: 1, colSpan: 1, rowSpan: 1, role: 'P' },
        { colOffset: 2, rowOffset: 1, colSpan: 1, rowSpan: 1, role: 'P' },
        { colOffset: 3, rowOffset: 1, colSpan: 1, rowSpan: 1, role: 'P' },
        { colOffset: 4, rowOffset: 1, colSpan: 1, rowSpan: 1, role: 'P' },
      ],
    },
    {
      dL: 1, dP: 2, rows: 1, weight: 5,
      slots: [
        { colOffset: 0, rowOffset: 0, colSpan: 1, rowSpan: 1, role: 'P' },
        { colOffset: 1, rowOffset: 0, colSpan: 3, rowSpan: 1, role: 'L' },
        { colOffset: 4, rowOffset: 0, colSpan: 1, rowSpan: 1, role: 'P' },
      ],
    },
    {
      dL: 2, dP: 2, rows: 2, weight: 5,
      slots: [
        { colOffset: 0, rowOffset: 0, colSpan: 2, rowSpan: 2, role: 'T' },
        { colOffset: 2, rowOffset: 0, colSpan: 2, rowSpan: 1, role: 'L' },
        { colOffset: 4, rowOffset: 0, colSpan: 1, rowSpan: 2, role: 'T' },
        { colOffset: 2, rowOffset: 1, colSpan: 2, rowSpan: 1, role: 'L' },
      ],
    },
    {
      dL: 0, dP: 4, rows: 2, weight: 6,
      slots: [
        { colOffset: 0, rowOffset: 0, colSpan: 2, rowSpan: 2, role: 'T' },
        { colOffset: 2, rowOffset: 0, colSpan: 1, rowSpan: 2, role: 'T' },
        { colOffset: 3, rowOffset: 0, colSpan: 1, rowSpan: 2, role: 'T' },
        { colOffset: 4, rowOffset: 0, colSpan: 1, rowSpan: 2, role: 'T' },
      ],
    },
    {
      dL: 0, dP: 3, rows: 2, weight: 8,
      slots: [
        { colOffset: 0, rowOffset: 0, colSpan: 2, rowSpan: 2, role: 'T' },
        { colOffset: 2, rowOffset: 0, colSpan: 2, rowSpan: 2, role: 'T' },
        { colOffset: 4, rowOffset: 0, colSpan: 1, rowSpan: 2, role: 'T' },
      ],
    },
    {
      dL: 1, dP: 1, rows: 1, weight: 9,
      slots: [
        { colOffset: 0, rowOffset: 0, colSpan: 4, rowSpan: 1, role: 'L' },
        { colOffset: 4, rowOffset: 0, colSpan: 1, rowSpan: 1, role: 'P' },
      ],
    },
    {
      dL: 2, dP: 0, rows: 1, weight: 10,
      slots: [
        { colOffset: 0, rowOffset: 0, colSpan: 3, rowSpan: 1, role: 'L' },
        { colOffset: 3, rowOffset: 0, colSpan: 2, rowSpan: 1, role: 'L' },
      ],
    },
    {
      dL: 1, dP: 0, rows: 1, weight: 15,
      slots: [{ colOffset: 0, rowOffset: 0, colSpan: 5, rowSpan: 1, role: 'L' }],
    },
    {
      dL: 0, dP: 2, rows: 2, weight: 16,
      slots: [
        { colOffset: 0, rowOffset: 0, colSpan: 2, rowSpan: 2, role: 'T' },
        { colOffset: 2, rowOffset: 0, colSpan: 3, rowSpan: 2, role: 'T' },
      ],
    },
    {
      dL: 0, dP: 1, rows: 2, weight: 20,
      slots: [{ colOffset: 0, rowOffset: 0, colSpan: 5, rowSpan: 2, role: 'T' }],
    },
  ],

  3: [
    {
      dL: 1, dP: 1, rows: 1, weight: 1,
      slots: [
        { colOffset: 0, rowOffset: 0, colSpan: 2, rowSpan: 1, role: 'L' },
        { colOffset: 2, rowOffset: 0, colSpan: 1, rowSpan: 1, role: 'P' },
      ],
    },
    {
      dL: 0, dP: 3, rows: 1, weight: 2,
      slots: [
        { colOffset: 0, rowOffset: 0, colSpan: 1, rowSpan: 1, role: 'P' },
        { colOffset: 1, rowOffset: 0, colSpan: 1, rowSpan: 1, role: 'P' },
        { colOffset: 2, rowOffset: 0, colSpan: 1, rowSpan: 1, role: 'P' },
      ],
    },
    {
      dL: 1, dP: 3, rows: 2, weight: 2,
      slots: [
        { colOffset: 0, rowOffset: 0, colSpan: 2, rowSpan: 1, role: 'L' },
        { colOffset: 2, rowOffset: 0, colSpan: 1, rowSpan: 2, role: 'T' },
        { colOffset: 0, rowOffset: 1, colSpan: 1, rowSpan: 1, role: 'P' },
        { colOffset: 1, rowOffset: 1, colSpan: 1, rowSpan: 1, role: 'P' },
      ],
    },
    {
      dL: 0, dP: 4, rows: 2, weight: 3,
      slots: [
        { colOffset: 0, rowOffset: 0, colSpan: 1, rowSpan: 2, role: 'T' },
        { colOffset: 1, rowOffset: 0, colSpan: 1, rowSpan: 1, role: 'P' },
        { colOffset: 2, rowOffset: 0, colSpan: 1, rowSpan: 2, role: 'T' },
        { colOffset: 1, rowOffset: 1, colSpan: 1, rowSpan: 1, role: 'P' },
      ],
    },
    {
      dL: 0, dP: 5, rows: 2, weight: 3,
      slots: [
        { colOffset: 0, rowOffset: 0, colSpan: 1, rowSpan: 2, role: 'T' },
        { colOffset: 1, rowOffset: 0, colSpan: 1, rowSpan: 1, role: 'P' },
        { colOffset: 2, rowOffset: 0, colSpan: 1, rowSpan: 1, role: 'P' },
        { colOffset: 1, rowOffset: 1, colSpan: 1, rowSpan: 1, role: 'P' },
        { colOffset: 2, rowOffset: 1, colSpan: 1, rowSpan: 1, role: 'P' },
      ],
    },
    {
      dL: 1, dP: 2, rows: 3, weight: 5,
      slots: [
        { colOffset: 0, rowOffset: 0, colSpan: 3, rowSpan: 1, role: 'L' },
        { colOffset: 0, rowOffset: 1, colSpan: 2, rowSpan: 2, role: 'T' },
        { colOffset: 2, rowOffset: 1, colSpan: 1, rowSpan: 2, role: 'T' },
      ],
    },
    {
      dL: 2, dP: 1, rows: 2, weight: 5,
      slots: [
        { colOffset: 0, rowOffset: 0, colSpan: 2, rowSpan: 1, role: 'L' },
        { colOffset: 2, rowOffset: 0, colSpan: 1, rowSpan: 2, role: 'T' },
        { colOffset: 0, rowOffset: 1, colSpan: 2, rowSpan: 1, role: 'L' },
      ],
    },
    {
      dL: 0, dP: 2, rows: 2, weight: 6,
      slots: [
        { colOffset: 0, rowOffset: 0, colSpan: 2, rowSpan: 2, role: 'T' },
        { colOffset: 2, rowOffset: 0, colSpan: 1, rowSpan: 2, role: 'T' },
      ],
    },
    {
      dL: 1, dP: 0, rows: 1, weight: 10,
      slots: [{ colOffset: 0, rowOffset: 0, colSpan: 3, rowSpan: 1, role: 'L' }],
    },
    {
      dL: 0, dP: 1, rows: 2, weight: 18,
      slots: [{ colOffset: 0, rowOffset: 0, colSpan: 3, rowSpan: 2, role: 'T' }],
    },
  ],

  2: [
    {
      dL: 1, dP: 0, rows: 1, weight: 1,
      slots: [{ colOffset: 0, rowOffset: 0, colSpan: 2, rowSpan: 1, role: 'L' }],
    },
    {
      dL: 0, dP: 2, rows: 1, weight: 1,
      slots: [
        { colOffset: 0, rowOffset: 0, colSpan: 1, rowSpan: 1, role: 'P' },
        { colOffset: 1, rowOffset: 0, colSpan: 1, rowSpan: 1, role: 'P' },
      ],
    },
    {
      dL: 0, dP: 3, rows: 3, weight: 3,
      slots: [
        { colOffset: 0, rowOffset: 0, colSpan: 2, rowSpan: 2, role: 'T' },
        { colOffset: 0, rowOffset: 2, colSpan: 1, rowSpan: 1, role: 'P' },
        { colOffset: 1, rowOffset: 2, colSpan: 1, rowSpan: 1, role: 'P' },
      ],
    },
    {
      dL: 0, dP: 1, rows: 2, weight: 12,
      slots: [{ colOffset: 0, rowOffset: 0, colSpan: 2, rowSpan: 2, role: 'T' }],
    },
  ],
};

function selectBands(totalL: number, totalP: number, cols: 2 | 3 | 4 | 5): readonly BandTemplate[] {
  const templates = BANDS_BY_COLS[cols];
  const stride = totalP + 1;
  const count = (totalL + 1) * stride;
  const cost = new Float64Array(count).fill(Number.POSITIVE_INFINITY);
  const choice = new Int32Array(count).fill(-1);
  cost[0] = 0;

  for (let l = 0; l <= totalL; l++) {
    for (let p = 0; p <= totalP; p++) {
      const idx = l * stride + p;
      if (idx === 0) continue;
      let bestCost = Number.POSITIVE_INFINITY;
      let bestBand = -1;
      for (let b = 0; b < templates.length; b++) {
        const band = templates[b];
        if (band.dL > l || band.dP > p) continue;
        const prevCost = cost[(l - band.dL) * stride + (p - band.dP)];
        if (!Number.isFinite(prevCost)) continue;
        const prevBand = choice[(l - band.dL) * stride + (p - band.dP)];
        const repeatPenalty = prevBand === b ? 0.35 : 0;
        const candidate = prevCost + band.weight + repeatPenalty;
        if (candidate < bestCost) {
          bestCost = candidate;
          bestBand = b;
        }
      }
      cost[idx] = bestCost;
      choice[idx] = bestBand;
    }
  }

  const picked: BandTemplate[] = [];
  let l = totalL;
  let p = totalP;
  while (l > 0 || p > 0) {
    const bandIndex = choice[l * stride + p];
    if (bandIndex < 0) break;
    const band = templates[bandIndex];
    picked.push(band);
    l -= band.dL;
    p -= band.dP;
  }
  picked.reverse();
  return picked;
}

export function packGalleryItems(items: readonly OurWorkImage[], cols: 2 | 3 | 4 | 5): PackedGallery {
  if (!items.length) return { items: [], totalRows: 0 };

  const landscapes: OurWorkImage[] = [];
  const tallPortraits: OurWorkImage[] = [];
  const compactPortraits: OurWorkImage[] = [];

  for (const item of items) {
    if (item.aspectRatio >= 1.25) {
      landscapes.push(item);
    } else if (item.preferTall) {
      tallPortraits.push(item);
    } else {
      compactPortraits.push(item);
    }
  }

  const portraitsByTallness = [
    ...tallPortraits,
    ...[...compactPortraits].sort((a, b) => a.aspectRatio - b.aspectRatio),
  ];

  const bands = selectBands(landscapes.length, portraitsByTallness.length, cols);

  let lCursor = 0;
  let tallCursor = 0;
  let compactCursor = portraitsByTallness.length - 1;

  const placed: PlacedGalleryItem[] = [];
  let rowBase = 0;

  for (const band of bands) {
    for (const slot of band.slots) {
      let chosen: OurWorkImage | undefined;
      if (slot.role === 'L') {
        chosen = landscapes[lCursor++];
      } else if (slot.role === 'T') {
        chosen = portraitsByTallness[tallCursor++];
      } else {
        chosen = portraitsByTallness[compactCursor--];
      }
      if (!chosen) continue;
      placed.push({
        ...chosen,
        colStart: slot.colOffset + 1,
        rowStart: rowBase + slot.rowOffset + 1,
        colSpan: slot.colSpan,
        rowSpan: slot.rowSpan,
      });
    }
    rowBase += band.rows;
  }

  placed.sort((a, b) => (a.rowStart - b.rowStart) || (a.colStart - b.colStart));

  return { items: placed, totalRows: rowBase };
}
