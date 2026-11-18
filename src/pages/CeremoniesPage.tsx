import { CtaBand } from '../components/common/CtaBand';
import { CeremonyCorridor } from '../sections/CeremonyCorridor/CeremonyCorridor';
import { HeadToToe } from '../sections/HeadToToe/HeadToToe';

/** The existing immersive ceremony corridor and head-to-toe scenes, unchanged, on their own route. */
export function CeremoniesPage() {
  return <>
    <CeremonyCorridor />
    <HeadToToe />
    <div className="mm">
      <CtaBand eyebrow="Book a Fitting" title={<>Tell Us About Your <em>Ceremonies</em></>} text="We will come back with ideas, fabrics and a timeline. For a wedding, start two to three months ahead." />
    </div>
  </>;
}
