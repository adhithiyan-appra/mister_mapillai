import type { CollectionLook } from '../types';
import { outfits } from './outfits';

/** Catalogue view of the outfit records in ./outfits (the single source of truth). */
export const collectionLooks: readonly CollectionLook[] = outfits.map(outfit => ({
  image: outfit.image,
  thumbnail: outfit.thumbnail,
  name: outfit.garment,
  description: outfit.summary,
}));
