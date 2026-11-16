import { SourceImage } from '../../components/common/SourceImage';
import { LotusOrnament } from '../../components/common/LotusOrnament';
import { contactConfig } from '../../data/contact';
import type { ContactDetails } from '../../data/contact';

interface ContactInfoCardProps {
  details?: ContactDetails;
}

export function ContactInfoCard({ details = contactConfig }: ContactInfoCardProps) {
  return (
    <aside className="touch" aria-label="Atelier contact information">
      <div className="in">
        <SourceImage asset="bandhgala-ivory" alt="Groom in an ivory bandhgala" />
        <div className="panel">
          <LotusOrnament align="left" />
          <h2>Get in touch</h2>
          <ul>
            <li>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
                <rect x="3" y="3" width="18" height="18" rx="5" />
                <circle cx="12" cy="12" r="4.2" />
                <circle cx="17.3" cy="6.7" r=".8" fill="currentColor" />
              </svg>
              <a href={details.instagram} target="_blank" rel="noopener noreferrer">
                Instagram {details.instagramHandle}
              </a>
            </li>

            {details.phone ? (
              <li>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
                  <path d="M5 3h4l2 5-2.5 1.5a11 11 0 0 0 6 6L16 13l5 2v4a2 2 0 0 1-2 2A17 17 0 0 1 3 5a2 2 0 0 1 2-2z" />
                </svg>
                <a href={`tel:${details.phone.replace(/\s/g, '')}`}>{details.phone}</a>
              </li>
            ) : null}

            {details.email ? (
              <li>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
                  <rect x="3" y="5" width="18" height="14" rx="1.5" />
                  <path d="m3.5 6 8.5 7 8.5-7" />
                </svg>
                <a href={`mailto:${details.email}`}>{details.email}</a>
              </li>
            ) : null}

            {details.address ? (
              <li>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden="true">
                  <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z" />
                  <circle cx="12" cy="9.5" r="2.5" />
                </svg>
                <span>{details.address}</span>
              </li>
            ) : null}
          </ul>
        </div>
      </div>
    </aside>
  );
}
