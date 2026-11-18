import type { ReactNode } from 'react';

interface SectionHeadingProps {
  eyebrow: string;
  title: ReactNode;
  lead?: ReactNode;
  level?: 'h1' | 'h2';
  align?: 'center' | 'left';
  id?: string;
  /** The gold rule under the title (template default). */
  line?: boolean;
  className?: string;
}

/** Eyebrow, serif title (an <em> inside renders in gold italic), gold rule and lead. */
export function SectionHeading({ eyebrow, title, lead, level = 'h2', align = 'center', id, line = true, className = '' }: SectionHeadingProps) {
  const Title = level;
  return <div className={`mm-reveal${align === 'center' ? ' mm-center' : ''} ${className}`.trim()}>
    <span className="mm-eyebrow">{eyebrow}</span>
    <Title className="mm-title" id={id}>{title}</Title>
    {line ? <div className="mm-gold-line" aria-hidden="true" /> : null}
    {lead ? <p className="mm-lead">{lead}</p> : null}
  </div>;
}
