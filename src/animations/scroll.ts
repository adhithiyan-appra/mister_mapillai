/**
 * MISTER MAPILLAI — ScrollTrigger & Motion Helpers
 * Safely registers GSAP plugins and handles prefers-reduced-motion media matching.
 */
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/**
 * Checks whether the user has requested reduced motion.
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Safe GSAP matchMedia helper that skips intensive scroll effects under reduced motion.
 */
export function createSafeMotionContext(setup: (ctx: gsap.Context) => void): () => void {
  const mm = gsap.matchMedia();
  mm.add('(prefers-reduced-motion: no-preference)', (ctx) => {
    setup(ctx);
  });
  return () => mm.revert();
}

export { gsap, ScrollTrigger };
