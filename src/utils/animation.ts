export const clamp = (value: number, min = 0, max = 1): number => Math.min(max, Math.max(min, value));
export const ease = (t: number): number => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

const baseScrollResponse = 4.8;
const maxScrollResponse = 14;
const catchUpDistance = 0.1;

export function scrollSmoothing(deltaTime: number, normalizedDistance = 0): number {
  const distance = clamp(Math.abs(normalizedDistance) / catchUpDistance);
  const catchUp = distance * distance * (3 - 2 * distance);
  const response = baseScrollResponse + (maxScrollResponse - baseScrollResponse) * catchUp;
  return 1 - Math.exp(-deltaTime * response);
}

type AnimatedStyle = 'transform' | 'opacity' | 'visibility' | 'filter' | 'width' | 'height' | 'willChange' | 'zIndex' | 'pointerEvents';
const writtenStyles = new WeakMap<HTMLElement | SVGElement, Map<string, string>>();

export function writeStyle(node: HTMLElement | SVGElement, property: AnimatedStyle, value: string) {
  let previous = writtenStyles.get(node);
  if (!previous) { previous = new Map(); writtenStyles.set(node, previous); }
  if (previous.get(property) === value) return;
  previous.set(property, value);
  node.style[property] = value;
}

export function writeVariable(node: HTMLElement, property: `--${string}`, value: string) {
  if (node.style.getPropertyValue(property) !== value) node.style.setProperty(property, value);
}

export function elements<T extends Element = HTMLElement>(parent: ParentNode, selector: string): T[] {
  return Array.from(parent.querySelectorAll<T>(selector));
}

export function element<T extends Element = HTMLElement>(parent: ParentNode, selector: string): T {
  const result = parent.querySelector<T>(selector);
  if (!result) throw new Error(`Missing animation element: ${selector}`);
  return result;
}
