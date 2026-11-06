import { Fragment } from 'react';
import { SourceImage } from '../../components/common/SourceImage';
import type { ImageKey } from '../../data/images';
import type { JourneyChapterData, JourneyObject } from '../../types';

function picture(asset: ImageKey, width: number, alt: string) {
  return <div className="pic" style={{ width }}><SourceImage asset={asset} alt={alt} style={{ height: 'auto' }} /></div>;
}

function chip(text: string, x: number, y: number, z: number, at: number, big = false): JourneyObject {
  return { content: <div className={`chip${big ? ' big' : ''}`}>{text}</div>, x, y, z, at };
}

function MeasuringTape() {
  return (
    <svg className="tapeo" viewBox="0 0 600 52" aria-hidden="true">
      <defs><linearGradient id="tg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#F3D995" /><stop offset="1" stopColor="#B48C47" /></linearGradient></defs>
      <rect width="600" height="52" rx="3" fill="url(#tg)" />
      {Array.from({ length: 61 }, (_, i) => <Fragment key={i}>
        <rect x={i * 10} y="0" width="1.2" height={i % 10 === 0 ? 22 : i % 5 === 0 ? 15 : 9} fill="#3A0607" />
        {i % 10 === 0 && i > 0 ? <text x={i * 10 + 3} y="40" fontFamily="Josefin Sans,sans-serif" fontSize="11" fill="#3A0607">{i}</text> : null}
      </Fragment>)}
    </svg>
  );
}

export const journeyChapters: readonly JourneyChapterData[] = [
  {
    key: 'Connect', title: 'It starts with a message', description: 'Send us your wedding date and functions on Instagram or WhatsApp, and we set up a consultation.', background: 'veshti-wide',
    objects: [{ x: 0, y: 0, z: 0, content: <div className="phone"><div className="ph-top"><i>M</i>Mister Mapillai</div>
      <div className="bub me" data-at="-.36">Hi! Our wedding is in February. Can you design my looks?</div>
      <div className="bub us" data-at="-.16">Congratulations! Tell us your functions and the theme you have in mind.</div>
      <div className="bub me" data-at=".04">Nichayathartham, muhurtham and reception. Temple theme, ivory and gold.</div>
      <div className="bub us" data-at=".2">Lovely. Let’s meet for a consultation this week.</div>
    </div> }],
  },
  {
    key: 'Consult', title: 'We listen to your story', description: 'Your ceremonies, venue, family traditions and the look you want for each one.', background: 'threepiece-wide',
    objects: [chip('Your wedding, your way', -40, -30, 240, -0.3, true), chip('Nichayathartham', -250, -190, 120, -0.25), chip('Muhurtham', 170, -210, -60, -0.18), chip('Reception', 250, -60, 180, -0.1), chip('Temple theme', -220, 90, -120, -0.04), chip('Ivory and gold', 140, 140, 60, 0.04), chip('Family traditions', -40, 230, -200, 0.12)],
  },
  {
    key: 'Design', title: 'A moodboard and a palette', description: 'We build a visual story for your wedding and the colours every look will follow.', background: 'moodboard', soft: true,
    objects: [
      { content: picture('moodboard', 540, 'Royal Procession wedding moodboard'), x: -30, y: -40, z: -40, at: -0.4, rotation: 'rotateY(-10deg)' },
      ...[['Ivory silk', '#EFE3CC'], ['Sand beige', '#D9C6A2'], ['Muted gold', '#B8935A'], ['Antique brass', '#8A6838'], ['Temple stone', '#CDB48A'], ['Champagne', '#E4D2AE']].map(([name, color], i) => ({ content: <div className="sw"><i style={{ background: color }} />{name}</div>, x: -300 + i * 120, y: i % 2 ? 210 : 250, z: 200, at: -0.2 + i * 0.06 })),
    ],
  },
  {
    key: 'Motifs', title: 'Motifs and a sketch', description: 'Temple, elephant and floral motifs are drawn, then placed on a technical sketch before a stitch is made.',
    objects: [
      { content: picture('motifs', 480, 'Temple, elephant and floral motif studies'), x: -150, y: -80, z: -140, at: -0.4, rotation: 'rotateY(8deg)' },
      { content: picture('devatan-sketch', 440, 'Devatan technical embroidery sketch'), x: 170, y: 90, z: 140, at: -0.12, rotation: 'rotateY(-8deg)' },
    ],
  },
  {
    key: 'Measure', title: 'Measured to you', description: 'Every piece is cut from your own measurements, taken at the studio and checked at each fitting.', background: 'charcoal-wide',
    objects: [
      { content: <MeasuringTape />, x: -280, y: -170, z: 120, at: -0.35, rotation: 'rotateZ(-6deg)', className: 'tape' },
      { content: <div className="mcard"><b>Your measurements</b>{['Chest', 'Shoulder', 'Sleeve', 'Waist', 'Length'].map(name => <div key={name}><span>{name}</span><span>Taken in studio</span></div>)}</div>, x: 0, y: 60, z: 0, at: -0.12 },
    ],
  },
  {
    key: 'Craft', title: 'Worked by hand', description: 'Aari, zari and bead embroidery on premium silks, built up motif by motif.', background: 'place-1', soft: true,
    objects: [
      { asset: 'detail-1', x: -230, y: -90, z: 170, at: -0.32 },
      { asset: 'detail-0', x: 60, y: -170, z: -110, at: -0.22 },
      { asset: 'detail-2', x: 220, y: 80, z: 80, at: -0.12 },
      { asset: 'detail-3', x: -60, y: 140, z: -40, at: -0.02 },
    ].map(({ asset, ...position }) => ({ ...position, content: <div className="circ"><SourceImage asset={asset as ImageKey} alt="Hand-worked zari, aari and bead embroidery detail" /></div> })),
  },
  {
    key: 'Fit', title: 'Fitted and styled, head to toe', description: 'Trial fittings, then the belt, footwear, stole and buttons that finish the look.', background: 'shirt-wide', soft: true,
    objects: [
      { content: <div className="archp"><SourceImage asset="ceremonial-shirt" alt="Complete ceremonial look with embroidered shirt, belt, trousers and oxfords" /></div>, x: 0, y: 0, z: 0, at: -0.4 },
      chip('Collar', -250, -190, 140, -0.25), chip('Embroidery', 250, -130, 90, -0.17), chip('Belt', -270, 10, 170, -0.09), chip('Footwear', 250, 170, 110, -0.01), chip('Stole and buttons', -230, 200, 70, 0.07),
    ],
  },
  { key: 'The day', title: 'Ready for the day', description: 'Delivered pressed and ready, so you walk into every ceremony feeling like yourself.', background: 'signature-wide', clear: true, objects: [] },
  { key: 'Delivered', title: 'Bespoke for life’s greatest moments', description: 'Groom and occasion wear for men, from the first message to the last photograph.', end: true, objects: [] },
];
