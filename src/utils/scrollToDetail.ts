import { clamp } from './animation';

export function scrollToDetail(section: HTMLElement | null, progress: number) {
  if (!section) return;
  const top = section.getBoundingClientRect().top + window.scrollY;
  const distance = section.offsetHeight - innerHeight;
  window.scrollTo({ top: top + clamp(progress) * distance, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' });
}
