import { Collection } from '../sections/Collection/Collection';
import { CeremonyCorridor } from '../sections/CeremonyCorridor/CeremonyCorridor';
import { HeadToToe } from '../sections/HeadToToe/HeadToToe';
import { FittingCta } from '../sections/Consultation/FittingCta';

export function CollectionsPage() {
  return <>
    <Collection />
    <CeremonyCorridor />
    <HeadToToe />
    <FittingCta />
  </>;
}
