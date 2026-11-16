import { contactConfig } from '../../data/contact';

export function AppointmentStrip() {
  return (
    <div className="strip" aria-label="Appointment and consultation details">
      <div>
        <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
          <rect x="5" y="8" width="30" height="27" rx="1.5" />
          <path d="M5 15h30M12 4v7M28 4v7M11 21h4M18 21h4M25 21h4M11 27h4M18 27h4" />
        </svg>
        <div>
          <b>By appointment</b>
          <span>A one-to-one fitting with our stylists.</span>
        </div>
      </div>

      <div>
        <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
          <path d="M6 10h22v15H14l-7 6v-6H6z" />
          <path d="M28 16h6v13h-2v5l-6-5H16v-4" />
        </svg>
        <div>
          <b>Plan ahead</b>
          <span>Start two to three months before the wedding.</span>
        </div>
      </div>

      <div>
        <svg viewBox="0 0 40 40" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
          <circle cx="20" cy="20" r="15" />
          <path d="M20 11v10l6 4" />
        </svg>
        <div>
          <b>Studio hours</b>
          {contactConfig.hours ? (
            <span>{contactConfig.hours}</span>
          ) : (
            <span className="nohours">Ask us on Instagram for a time that suits you.</span>
          )}
        </div>
      </div>
    </div>
  );
}
