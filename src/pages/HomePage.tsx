import { CtaBand } from '../components/common/CtaBand';
import { GallerySection } from '../sections/Home/GallerySection';
import { HeroSection } from '../sections/Home/HeroSection';
import { JourneySection } from '../sections/Home/JourneySection';
import { OccasionsSection } from '../sections/Home/OccasionsSection';
import { CeremonyMarquee, StatsSection } from '../sections/Home/StatsSection';
import { TestimonialsSection } from '../sections/Home/TestimonialsSection';
import { TransformationSection } from '../sections/Home/TransformationSection';

export function HomePage() {
  return <div className="mm mm-page">
    <HeroSection />
    <StatsSection />
    <CeremonyMarquee />
    <OccasionsSection />
    <TransformationSection />
    <JourneySection />
    <GallerySection />
    <TestimonialsSection />
    <CtaBand eyebrow="Begin Your Look" title={<>Your Big Day Deserves a <em>Masterpiece</em></>} text="Book a consultation at our studio or over a video call." />
  </div>;
}
