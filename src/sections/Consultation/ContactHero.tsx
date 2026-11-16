import { LotusOrnament } from '../../components/common/LotusOrnament';

export function ContactHero() {
  return (
    <section className="band" aria-labelledby="contact-heading">
      <LotusOrnament align="center" />
      <h1 id="contact-heading">Book your fitting consultation</h1>
      <p className="lede">
        Tell us about your ceremonies and your dream look. We’ll come back with ideas, fabrics and a timeline.
      </p>
    </section>
  );
}
