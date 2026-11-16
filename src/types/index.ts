import type { ReactNode } from 'react';
import type { ImageKey } from '../data/images';

export interface JourneyObject {
  content: ReactNode;
  x: number;
  y: number;
  z: number;
  at?: number;
  rotation?: string;
  className?: string;
}

export interface JourneyChapterData {
  key: string;
  title: string;
  description: string;
  background?: ImageKey;
  soft?: boolean;
  clear?: boolean;
  end?: boolean;
  objects: JourneyObject[];
}

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

export interface EmbroideryDetail extends StylingDetail {
  image: ImageKey;
  technique: string;
}

export interface CollectionLook {
  image: ImageKey;
  thumbnail: ImageKey;
  name: string;
  description: string;
}
