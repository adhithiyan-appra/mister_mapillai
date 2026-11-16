import type { ImageKey } from './images';

export interface HappyGroomsHotspot {
  x: number;
  y: number;
  image: ImageKey;
  technique: string;
  title: string;
  description: string;
}

export interface HappyGroomsMaterial {
  image: ImageKey;
  name: string;
  detail: string;
}

export interface HappyGroomsPlacement {
  image: ImageKey;
  caption: string;
  alt: string;
}

export const happyGroomsHotspots: readonly HappyGroomsHotspot[] = [
  {
    x: 0.17,
    y: 0.15,
    image: 'happy-grooms-detail-0',
    technique: 'Aari, zari and beads',
    title: 'Temple motif',
    description: 'A gopuram crown on each shoulder, finished with pearl drops.',
  },
  {
    x: 0.64,
    y: 0.12,
    image: 'happy-grooms-detail-1',
    technique: 'Aari and zari',
    title: 'Elephant motif',
    description: 'A caparisoned royal elephant at the front of the shoulder.',
  },
  {
    x: 0.07,
    y: 0.55,
    image: 'happy-grooms-detail-2',
    technique: 'Aari work',
    title: 'Floral vine',
    description: 'Climbing florals down the sleeve, embroidered to the elbow.',
  },
  {
    x: 0.91,
    y: 0.62,
    image: 'happy-grooms-detail-3',
    technique: 'Zari and beads',
    title: 'Leaf motif',
    description: 'Fine leaves in antique gold zari, each tipped with a bead.',
  },
  {
    x: 0.6,
    y: 0.62,
    image: 'happy-grooms-detail-4',
    technique: 'Beads on body',
    title: 'Scatter motif',
    description: 'Small four-bead flowers scattered lightly across the body.',
  },
];

export const happyGroomsPlacements: readonly HappyGroomsPlacement[] = [
  {
    image: 'happy-grooms-place-front',
    caption: 'Shoulder, front',
    alt: 'Shoulder embroidery, front',
  },
  {
    image: 'happy-grooms-place-sleeve',
    caption: 'Sleeve, to elbow',
    alt: 'Sleeve embroidery',
  },
  {
    image: 'happy-grooms-place-back',
    caption: 'Shoulder, back',
    alt: 'Shoulder embroidery, back',
  },
];

export const happyGroomsMaterials: readonly HappyGroomsMaterial[] = [
  { image: 'happy-grooms-material-silk', name: 'Pure silk', detail: 'Golden base fabric' },
  { image: 'happy-grooms-material-zari', name: 'Zari', detail: 'Antique gold' },
  { image: 'happy-grooms-material-pearls', name: 'Pearls', detail: 'Soft highlights' },
  { image: 'happy-grooms-material-beads', name: 'Matte beads', detail: 'Texture' },
  { image: 'happy-grooms-material-thread', name: 'Silk thread', detail: 'Aari outlines' },
];
