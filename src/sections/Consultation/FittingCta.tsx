import { Button } from '../../components/common/Button';

export function FittingCta() {
  return <section className="consult" aria-label="Book a fitting">
    <div className="wrap cs solo">
      <div>
        <span className="label">Book a fitting</span>
        <h2 style={{ marginTop: 12 }}>Tell us about your ceremonies</h2>
        <p className="lede" style={{ marginTop: 18 }}>We will come back with ideas, fabrics and a timeline. For a wedding, start two to three months ahead.</p>
        <div className="cta-row"><Button href="/contact">Book a fitting consultation</Button></div>
      </div>
    </div>
  </section>;
}
