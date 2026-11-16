import { useEffect, useRef } from 'react';
import { LotusOrnament } from '../../components/common/LotusOrnament';
import { SourceImage } from '../../components/common/SourceImage';
import { happyGroomsMaterials, happyGroomsPlacements } from '../../data/happyGrooms';
import { images } from '../../data/images';
import { Devatan } from '../Devatan/Devatan';

function useTilt(amplitude: number) {
  const boxRef = useRef<HTMLDivElement>(null);
  const tiltRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = boxRef.current;
    const tilt = tiltRef.current;
    if (!box || !tilt) return;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame = 0;

    const reset = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      tilt.style.transform = '';
    };
    const move = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse' || reducedMotion.matches) return;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const rect = box.getBoundingClientRect();
        const x = (event.clientX - rect.left) / rect.width - 0.5;
        const y = (event.clientY - rect.top) / rect.height - 0.5;
        tilt.style.transform = `rotateY(${(x * amplitude).toFixed(3)}deg) rotateX(${(-y * amplitude * 0.7).toFixed(3)}deg)`;
      });
    };

    box.addEventListener('pointermove', move);
    box.addEventListener('pointerleave', reset);
    return () => {
      cancelAnimationFrame(frame);
      box.removeEventListener('pointermove', move);
      box.removeEventListener('pointerleave', reset);
    };
  }, [amplitude]);

  return { boxRef, tiltRef };
}

export function HappyGroomsStory() {
  const moodboardTilt = useTilt(8);
  const motifsTilt = useTilt(8);
  const sketchTilt = useTilt(8);
  const finalTilt = useTilt(4);

  return <div className="hg">
    <section className="hg-band" id="happy-grooms" aria-labelledby="happy-grooms-title">
      <div className="hg-band-bg" style={{ backgroundImage: `url(${images['happy-grooms-hero']})` }} aria-hidden="true" />
      <span className="label">Happy grooms</span>
      <h1 id="happy-grooms-title">Mr. Gowtham’s Royal Procession</h1>
      <p className="lede">How one groom’s idea became an heirloom, detail by detail.</p>
      <div className="hg-brief"><span>Theme: Royal Procession</span><span>Signature: Devatan shirt</span><span>Ivory, sand and gold</span></div>
    </section>

    <section className="hg-final" aria-label="Mr. Gowtham, on his day">
      <div className="wrap">
        <figure className="hg-final-figure" ref={finalTilt.boxRef}>
          <div className="hg-final-ph hg-tilt" ref={finalTilt.tiltRef}>
            <SourceImage asset="happy-grooms-hero" alt="Mr. Gowtham wearing his bespoke embroidered Mister Mapillai shirt" responsive sizes="(max-width: 900px) 92vw, 1180px" />
          </div>
          <figcaption><span>Mr. Gowtham, on his day</span><span>Bespoke by Mister Mapillai</span></figcaption>
        </figure>
        <blockquote className="hg-quote" hidden>
          <div className="hg-orn"><LotusOrnament /></div>
          <p />
          <cite className="label">Mr. Gowtham</cite>
        </blockquote>
      </div>
    </section>

    <section className="hg-sec" aria-labelledby="happy-grooms-detail-title">
      <div className="wrap">
        <div className="hg-sec-head">
          <div className="hg-orn"><LotusOrnament /></div>
          <h2 id="happy-grooms-detail-title">The detailing behind his look</h2>
          <p className="lede">Five steps from a moodboard to the finished shirt.</p>
        </div>

        <article className="hg-chap">
          <div className="hg-vis" ref={moodboardTilt.boxRef}>
            <div className="hg-frame hg-tilt" ref={moodboardTilt.tiltRef}>
              <SourceImage asset="happy-grooms-moodboard" alt="Royal Procession moodboard: temple architecture, elephants, silk, palette" responsive sizes="(max-width: 900px) 92vw, 600px" />
            </div>
          </div>
          <div>
            <div className="hg-num gold-text">1</div>
            <h2>The moodboard</h2>
            <p className="lede">His idea, gathered into one board: temple towers, royal elephants, festive umbrellas and silk in ivory, sand and gold.</p>
            <ul className="hg-facts"><li><b>Theme</b><span>Royal Procession</span></li><li><b>Palette</b><span>Ivory silk, sand beige, muted gold, antique brass</span></li></ul>
          </div>
        </article>

        <article className="hg-chap hg-flip">
          <div className="hg-vis" ref={motifsTilt.boxRef}>
            <div className="hg-frame hg-tilt" ref={motifsTilt.tiltRef}>
              <SourceImage asset="happy-grooms-motifs" alt="Motif library: temple, elephant, umbrella, kalash, lotus and border patterns" responsive sizes="(max-width: 900px) 92vw, 600px" />
            </div>
          </div>
          <div>
            <div className="hg-num gold-text">2</div>
            <h2>The motif library</h2>
            <p className="lede">Every motif drawn by hand first, so the embroidery tells his story and nobody else’s.</p>
            <ul className="hg-facts"><li><b>Motifs</b><span>Temple, elephant, lotus, kalash, toranam</span></li><li><b>Borders</b><span>Temple border and floral vines</span></li></ul>
          </div>
        </article>

        <article className="hg-chap">
          <div className="hg-vis" ref={sketchTilt.boxRef}>
            <div className="hg-frame hg-tilt" ref={sketchTilt.tiltRef}>
              <SourceImage asset="devatan-sketch" alt="Technical flat sketch of the shirt, front, back and sleeve" responsive sizes="(max-width: 900px) 92vw, 600px" />
            </div>
            <div className="hg-places">
              {happyGroomsPlacements.map(place => <figure key={place.caption}>
                <SourceImage asset={place.image} alt={place.alt} responsive sizes="(max-width: 900px) 30vw, 190px" />
                <figcaption>{place.caption}</figcaption>
              </figure>)}
            </div>
          </div>
          <div>
            <div className="hg-num gold-text">3</div>
            <h2>Sketch and placement</h2>
            <p className="lede">A technical sketch fixes where every motif sits, front, back and sleeve, before a single stitch.</p>
          </div>
        </article>
      </div>
    </section>

    <Devatan />

    <section className="hg-sec" style={{ paddingTop: 0 }}>
      <div className="wrap">
        <article className="hg-chap" style={{ borderTop: 'none' }}>
          <div className="hg-mats">
            {happyGroomsMaterials.map(material => <figure key={material.name}>
              <SourceImage asset={material.image} alt="" />
              <figcaption>{material.name}<span>{material.detail}</span></figcaption>
            </figure>)}
          </div>
          <div>
            <div className="hg-num gold-text">5</div>
            <h2>The materials</h2>
            <p className="lede">Chosen to catch the light in temple corridors and wedding photographs.</p>
          </div>
        </article>
      </div>
    </section>
  </div>;
}
