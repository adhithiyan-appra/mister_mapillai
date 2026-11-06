import { AnimationProvider } from './components/animations/AnimationProvider';
import { TravellingSeal } from './components/animations/TravellingSeal';
import { ImageLoading } from './components/animations/ImageLoading';
import { Header } from './components/layout/Header';
import { Footer } from './components/layout/Footer';
import { GroomJourney } from './sections/GroomJourney/GroomJourney';
import { About } from './sections/About/About';
import { CeremonyCorridor } from './sections/CeremonyCorridor/CeremonyCorridor';
import { HeadToToe } from './sections/HeadToToe/HeadToToe';
import { Collection } from './sections/Collection/Collection';
import { Devatan } from './sections/Devatan/Devatan';
import { Story } from './sections/Story/Story';
import { Consultation } from './sections/Consultation/Consultation';

export default function App() {
  return <AnimationProvider>
    <Header />
    <main><GroomJourney /><About /><CeremonyCorridor /><HeadToToe /><Collection /><Devatan /><Story /><Consultation /></main>
    <TravellingSeal />
    <ImageLoading />
    <Footer />
  </AnimationProvider>;
}
