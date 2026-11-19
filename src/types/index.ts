import type { ImageKey } from '../data/images';

export interface CeremonyTransformationDetail {
  label: string;
  before: string;
  after: string;
}

export interface CeremonyTransformation {
  id: string;
  outfitId: string;
  category: string;
  title: string;
  subtitle: string;
  beforeImage: ImageKey;
  afterImage: ImageKey;
  description: string;
  details: readonly CeremonyTransformationDetail[];
}

export interface Ceremony {
  id: string;
  outfitId: string;
  category: string;
  title: string;
  subtitle: string;
  image: ImageKey;
  beforeImage: ImageKey;
  afterImage: ImageKey;
  description: string;
  transformationDetails: readonly CeremonyTransformationDetail[];
  details: readonly (readonly [string, string])[];
}

export interface StylingDetail {
  key: string;
  description: string;
  x: number;
  y: number;
}
