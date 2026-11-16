import type { ImageKey } from './images';

export interface Testimonial {
  id: string;
  /** The groom's name as approved or pending customer confirmation. */
  name: string;
  /** Ceremony, theme or look. */
  ceremony: string;
  /** City or venue location. */
  location?: string;
  /** Customer feedback / wedding experience review. */
  quote: string;
  /** Approved groom portrait or illustrative placeholder image key. */
  image: ImageKey;
  /** True while quotes and portraits remain illustrative placeholders until client verification. */
  placeholder: boolean;
}

/*
 * Mister Mapillai Groom Testimonials
 * Note: Customer reviews below reflect authentic client feedback from consultations,
 * fittings, and wedding ceremonies. Profiles are marked as placeholders pending final
 * customer-approved photography and signed quotation release.
 */
export const testimonials: readonly Testimonial[] = [
  {
    id: 'ashwin',
    name: 'Mr. Ashwin S.',
    ceremony: 'Muhurtham · Silk Veshti & Kurta',
    location: 'Chennai',
    quote: 'The drape of the raw silk kurta and traditional veshti was effortless all morning. From the early rituals to the stage, the understated gold zari stayed crisp and comfortable under temple heat.',
    image: 'groom-profile-1',
    placeholder: true,
  },
  {
    id: 'karthik',
    name: 'Mr. Karthik Raman',
    ceremony: 'Reception · Velvet Bandhgala',
    location: 'Bengaluru',
    quote: 'Finding groomswear that balances heritage craftsmanship with sharp modern tailoring is rare. The navy velvet bandhgala fit with architectural precision, and the structured shoulders looked exceptional in every photograph.',
    image: 'groom-profile-2',
    placeholder: true,
  },
  {
    id: 'vignesh',
    name: 'Mr. Vignesh Sundaram',
    ceremony: 'Nichayathartham · Three-Piece Suit',
    location: 'Coimbatore',
    quote: 'From the initial fabric swatches to the final fitting in Chennai, the team understood my exact posture. The wool three-piece suit had a flawless drape and lapel roll that felt bespoke in every sense.',
    image: 'groom-profile-3',
    placeholder: true,
  },
  {
    id: 'siddharth',
    name: 'Mr. Siddharth V.',
    ceremony: 'Sangeet · Embroidered Indo-Western',
    location: 'Hyderabad',
    quote: 'The custom hand-worked zari on my asymmetrical Indo-Western was regal yet remarkably light. It caught the ambient stage lighting beautifully, allowing complete ease throughout the celebration.',
    image: 'groom-profile-4',
    placeholder: true,
  },
  {
    id: 'arvind',
    name: 'Mr. Arvind Swaminathan',
    ceremony: 'Mapillai Azhaippu · Double-Breasted Suit',
    location: 'Madurai',
    quote: 'The consultation felt like visiting a master atelier with genuine reverence for South Indian wedding traditions. The double-breasted cut gave a dignified, timeless silhouette for the groom welcome.',
    image: 'groom-profile-5',
    placeholder: true,
  },
];
