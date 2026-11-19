/**
 * MISTER MAPILLAI — Animation Easings & Physics Curves
 * Standardized curves used across GSAP, CSS transitions, and canvas glide physics.
 */

export const EASINGS = {
  /** Primary luxury brand ease: smooth deceleration without overshoot */
  LUXURY: 'cubic-bezier(0.2, 0.7, 0.2, 1)',
  /** Entrance ease for text reveals and cards */
  ENTRANCE: 'power2.out',
  /** Smooth card scale-in */
  SCALE_IN: 'back.out(1.4)',
  /** Heavy dramatic sequence ease */
  DRAMATIC: 'power3.inOut',
} as const;

/** Canvas playhead inertia glide parameter (~0.22s) */
export const CANVAS_GLIDE = 0.22;
