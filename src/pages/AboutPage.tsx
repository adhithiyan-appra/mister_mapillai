import { CtaBand } from '../components/common/CtaBand';
import { PageBanner } from '../components/common/PageBanner';
import { brandPromise } from '../data/brand';
import { BrandPillars, BrandStory, MakingTimeline } from '../sections/AboutPage/AboutSections';
import { StudioSection } from '../sections/AboutPage/StudioSection';

export function AboutPage() {
  return <div className="mm mm-page mm-page--about">
    <PageBanner id="about-title" eyebrow="About Us" title={<>The Story of <em>Mister Mapillai</em></>} lead={brandPromise} />
    <BrandStory />
    <BrandPillars />
    <MakingTimeline />
    <StudioSection />
    <CtaBand eyebrow="Meet Us" title={<>Come Say <em>Vanakkam</em></>} text="Book a fitting consultation and tell us about your ceremonies." actionLabel="Book Your Look" />
  </div>;
}
