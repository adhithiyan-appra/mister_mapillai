import { useEffect, useRef, useState } from 'react';

interface CountUpProps {
  value: number;
  suffix?: string;
  decimals?: number;
  duration?: number;
}

/** Counts from zero to `value` the first time it scrolls into view. */
export function CountUp({ value, suffix = '', decimals = 0, duration = 1800 }: CountUpProps) {
  const ref = useRef<HTMLElement>(null);
  const text = useRef<HTMLSpanElement>(null);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    if (!('IntersectionObserver' in window) || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(value);
      return;
    }
    let raf = 0;
    const observer = new IntersectionObserver(entries => {
      if (!entries.some(entry => entry.isIntersecting)) return;
      observer.disconnect();
      const start = performance.now();
      const step = (now: number) => {
        const p = Math.min(1, (now - start) / duration);
        const eased = value * (1 - Math.pow(1 - p, 3));
        if (text.current) text.current.textContent = `${eased.toFixed(decimals)}${suffix}`;
        if (p < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }, { threshold: 0.15 });
    observer.observe(node);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [value, duration, decimals, suffix]);

  return <b ref={ref} aria-label={`${value.toFixed(decimals)}${suffix}`}>
    <span aria-hidden="true" ref={text}>{shown.toFixed(decimals)}{suffix}</span>
  </b>;
}
