import { SourceImage } from '../../components/common/SourceImage';
import type { ImageKey } from '../../data/images';

const features: readonly { title: string; description: string; image: ImageKey; alt: string }[] = [
  { title: 'Design', description: 'A theme, moodboard and palette built around your wedding story.', image: 'moodboard', alt: 'Royal Procession moodboard' },
  { title: 'Craft', description: 'Aari, zari and bead work by hand on premium silks.', image: 'place-1', alt: 'Zari and bead embroidery on a silk sleeve' },
  { title: 'Style', description: 'The full look, head to toe: belt, shoes, stole and buttons.', image: 'bandhgala-black', alt: 'Groom in a black embroidered bandhgala' },
];

export function About() {
  return <section className="about" id="about">
    <div className="about-pin" id="aboutPin"><div className="wrap about-in">
      <div className="fadeable">
        <span className="label">The groom’s designer</span>
        <h2>We dress the groom and the men of the family, for every function, top to bottom</h2>
        <p className="lede">Sherwanis, bandhgalas, suits, silk shirts and veshtis, designed to your ceremony and its theme, then styled with the belt, footwear and finishing pieces that complete it.</p>
      </div>
      <div className="trio fadeable">{features.map(feature => <figure key={feature.title}>
        <div className="ph"><SourceImage asset={feature.image} sizes="(max-width: 900px) 64px, clamp(72px, 10vh, 104px)" alt={feature.alt} /></div>
        <figcaption><h3>{feature.title}</h3><p>{feature.description}</p></figcaption>
      </figure>)}</div>
      <div className="dock-wrap"><div id="sealDock" /><p className="fadeable">Bespoke for life’s greatest moments</p></div>
    </div></div>
  </section>;
}
