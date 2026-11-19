/**
 * MISTER MAPILLAI — Core System Constants
 */

export const APP_ROUTES = {
  HOME: '/',
  COLLECTIONS: '/collections',
  ABOUT: '/about',
  CEREMONIES: '/ceremonies',
  CONTACT: '/contact',
  TRACK_ORDER: '/track-order',
} as const;

export const BRAND_COLORS = {
  MAROON_DARK: '#3a0811',
  MAROON: '#5a0f1c',
  MAROON_LIGHT: '#7a1a2b',
  GOLD: '#c9a24d',
  GOLD_LIGHT: '#e6c97a',
  GOLD_DEEP: '#9a7426',
  CREAM: '#f8f2e7',
  INK: '#1d1416',
} as const;

export const TIMING = {
  LOADER_MIN_MS: 700,
  LOADER_MAX_MS: 3800,
  PAGE_FADE_MS: 700,
  HERO_FRAME_COUNT: 192,
} as const;
