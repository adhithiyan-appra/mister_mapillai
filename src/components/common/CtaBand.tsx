import type { ReactNode } from 'react';
import { contactConfig, generalEnquiry, whatsappUrl } from '../../data/contact';
import { fittingHref } from '../../data/navigation';

interface CtaBandProps {
  eyebrow: string;
  title: ReactNode;
  text: string;
  actionLabel?: string;
  actionHref?: string;
}

/**
 * Closing call to action. The secondary button is WhatsApp when the studio
 * number is configured, otherwise the studio's Instagram.
 */
export function CtaBand({ eyebrow, title, text, actionLabel = 'Book a Consultation', actionHref = fittingHref }: CtaBandProps) {
  const chat = whatsappUrl(generalEnquiry);
  return <section className="mm-sec mm-cta">
    <div className="mm-ring" style={{ width: 600, height: 600, left: -200, top: -200 }} aria-hidden="true" />
    <div className="mm-ring" style={{ width: 420, height: 420, right: -120, bottom: -160, animationDirection: 'reverse' }} aria-hidden="true" />
    <div className="mm-container mm-reveal" style={{ position: 'relative' }}>
      <span className="mm-eyebrow">{eyebrow}</span>
      <h2 className="mm-title">{title}</h2>
      <p>{text}</p>
      <div className="mm-btns mm-btns--center">
        <a href={actionHref} className="mm-btn mm-btn--gold">{actionLabel}</a>
        {chat
          ? <a href={chat} className="mm-btn mm-btn--outline" target="_blank" rel="noopener noreferrer">WhatsApp Us</a>
          : <a href={contactConfig.instagram} className="mm-btn mm-btn--outline" target="_blank" rel="noopener noreferrer">Message on Instagram</a>}
      </div>
    </div>
  </section>;
}
