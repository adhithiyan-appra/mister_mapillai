import { PageBanner } from '../components/common/PageBanner';
import { bookingTrustPoints } from '../data/contact';
import { useRouter } from '../router';
import { BookingForm } from '../sections/Booking/BookingForm';

export function ContactPage() {
  const { search } = useRouter();
  const look = new URLSearchParams(search).get('look') ?? undefined;
  return <div className="mm mm-page">
    <PageBanner
      tall
      id="contact-heading"
      eyebrow="Book Your Look"
      title={<>Begin Your <em>Wedding Wardrobe</em></>}
      lead="Four quick steps. Your booking goes straight to our stylist on WhatsApp."
    />
    <section className="mm-sec mm-sec--flush" id="consult" aria-label="Booking form">
      <div className="mm-container">
        <BookingForm initialLook={look} />
        <ul className="mm-trust">
          {bookingTrustPoints.map(point => <li key={point}>{point}</li>)}
        </ul>
      </div>
    </section>
  </div>;
}
