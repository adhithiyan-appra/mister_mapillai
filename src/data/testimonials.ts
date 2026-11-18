export interface Testimonial {
  id: string;
  name: string;
  ceremony: string;
  quote: string;
  galleryFile: string;
}

export const testimonials: readonly Testimonial[] = [
  {
    id: 'karthik',
    name: 'Karthik Raman',
    ceremony: 'Muhurtham & Reception · Coimbatore',
    quote: 'From the Muhurtham veshti to the reception suit, everything matched perfectly. I did not visit a single other shop.',
    galleryFile: 'image1.png',
  },
  {
    id: 'arun',
    name: 'Arun Prakash',
    ceremony: 'Reception · Tiruppur',
    quote: 'They understood our theme in one meeting. The fittings were spot on and the outfit was ready a week early.',
    galleryFile: 'imagei.png',
  },
  {
    id: 'vignesh',
    name: 'Vignesh Kumar',
    ceremony: 'Engagement & Wedding · Erode',
    quote: 'They dressed me, my father and my brothers. The family photos look like one coordinated story.',
    galleryFile: 'image.png',
  },
];
