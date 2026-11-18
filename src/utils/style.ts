import type { CSSProperties } from 'react';

/** Typed inline CSS custom properties, e.g. `cssVars({ '--d': '.2s' })`. */
export function cssVars(values: Record<`--${string}`, string | number>, style: CSSProperties = {}): CSSProperties {
  return { ...style, ...values } as CSSProperties;
}
