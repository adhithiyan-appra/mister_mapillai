import { ContactInfoCard } from './ContactInfoCard';
import { ConsultationForm } from './ConsultationForm';
import { AppointmentStrip } from './AppointmentStrip';

export function Consultation() {
  return (
    <section className="ct" id="consult">
      <div className="wrap">
        <div className="ct-grid">
          <ContactInfoCard />
          <ConsultationForm />
        </div>
        <AppointmentStrip />
      </div>
    </section>
  );
}
