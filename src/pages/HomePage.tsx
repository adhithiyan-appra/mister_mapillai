import { About } from '../sections/About/About';
import { TravellingSeal } from '../components/animations/TravellingSeal';
import { Testimonials } from '../sections/Testimonials/Testimonials';
import { GroomJourney } from '../sections/GroomJourney/GroomJourney';

export function HomePage() {
  return <>
    <GroomJourney />
    <About />
    <TravellingSeal />
    <Testimonials />
  </>;
}
