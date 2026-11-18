import type { ReactNode } from 'react';

interface PageBannerProps {
  eyebrow: string;
  title: ReactNode;
  lead?: ReactNode;
  /** Extra bottom space for a card that overlaps the banner (forms). */
  tall?: boolean;
  id?: string;
}

/** The template's maroon page banner with a slowly turning gold ring. */
export function PageBanner({ eyebrow, title, lead, tall = false, id }: PageBannerProps) {
  return <section className={`mm-banner${tall ? ' mm-banner--tall' : ''}`} aria-labelledby={id}>
    <div className="mm-ring mm-ring--center" aria-hidden="true" />
    <div className="mm-container" style={{ position: 'relative' }}>
      <span className="mm-eyebrow">{eyebrow}</span>
      <h1 className="mm-title" id={id}>{title}</h1>
      {lead ? <p className="mm-lead">{lead}</p> : null}
    </div>
  </section>;
}
