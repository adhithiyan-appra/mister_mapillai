import { ConsultationForm } from './ConsultationForm';

export function Consultation() {
  return <section className="consult" id="consult"><div className="wrap cs">
    <div><span className="label">Book a fitting</span><h2 style={{ marginTop: 12 }}>Tell us about your ceremonies</h2>
      <p className="lede" style={{ marginTop: 18 }}>We will come back with ideas, fabrics and a timeline. For a wedding, start two to three months ahead.</p>
    </div>
    <ConsultationForm />
  </div></section>;
}
