import type { EmbroideryDetail, StylingDetail } from '../types';

export const stylingDetails: readonly StylingDetail[] = [
  { key: 'Collar', description: 'Spread collar with an embroidered placket', x: 0.5, y: 0.17 },
  { key: 'Embroidery', description: 'Hand-worked zari vines across chest and shoulders', x: 0.6, y: 0.25 },
  { key: 'Belt', description: 'Leather belt with a temple-motif gold buckle', x: 0.5, y: 0.425 },
  { key: 'Trousers', description: 'Tapered black trousers, hemmed to break on the shoe', x: 0.43, y: 0.68 },
  { key: 'Footwear', description: 'Black leather oxfords, polished for the stage', x: 0.37, y: 0.93 },
];

export const embroideryDetails: readonly EmbroideryDetail[] = [
  { x: 0.17, y: 0.15, image: 'detail-0', technique: 'Aari, zari and beads', key: 'Temple motif', description: 'A gopuram crown on each shoulder, finished with pearl drops.' },
  { x: 0.64, y: 0.12, image: 'detail-1', technique: 'Aari and zari', key: 'Elephant motif', description: 'A caparisoned royal elephant rests at the front of the shoulder.' },
  { x: 0.07, y: 0.55, image: 'detail-2', technique: 'Aari work', key: 'Floral vine', description: 'Climbing florals run down the sleeve, embroidered to the elbow.' },
  { x: 0.91, y: 0.62, image: 'detail-3', technique: 'Zari and beads', key: 'Leaf motif', description: 'Fine leaves in antique gold zari, each tipped with a matte bead.' },
  { x: 0.6, y: 0.62, image: 'detail-4', technique: 'Beads on body', key: 'Scatter motif', description: 'Small four-bead flowers scattered lightly across the body.' },
];
