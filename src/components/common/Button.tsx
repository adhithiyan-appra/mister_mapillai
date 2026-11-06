import type { AnchorHTMLAttributes } from 'react';

interface ButtonProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: 'solid' | 'line';
}

export function Button({ variant = 'solid', className = '', ...props }: ButtonProps) {
  return <a className={`btn ${variant} ${className}`.trim()} {...props} />;
}
