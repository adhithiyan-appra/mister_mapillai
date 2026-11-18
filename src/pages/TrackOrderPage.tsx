import { PageBanner } from '../components/common/PageBanner';
import { TrackOrder } from '../sections/Tracking/TrackOrder';

export function TrackOrderPage() {
  return <div className="mm mm-page">
    <PageBanner tall id="track-title" eyebrow="Track Order" title={<>Follow Your <em>Look</em></>} lead="Enter your Order ID or mobile number to see live status." />
    <section className="mm-sec mm-sec--flush" aria-label="Order tracking">
      <div className="mm-container" style={{ maxWidth: 860 }}>
        <TrackOrder />
      </div>
    </section>
  </div>;
}
