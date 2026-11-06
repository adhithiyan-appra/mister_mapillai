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

export interface Ceremony {
  title: string;
  subtitle: string;
  image: ImageKey;
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
