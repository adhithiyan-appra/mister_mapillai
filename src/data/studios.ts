import { contactConfig, mapsUrl } from './contact';
import type { ImageKey } from './images';
import { fittingHref } from './navigation';

export interface OpenStudioLocation {
  id: string;
  status: 'open';
  statusLabel: 'OPEN NOW';
  available: true;
  name: string;
  image: ImageKey;
  imageAlt: string;
  imagePosition?: string;
  address: string;
  hours?: string;
  directionsHref?: string;
  bookHref: string;
}

export interface UpcomingStudioLocation {
  id: string;
  status: 'upcoming';
  statusLabel: 'COMING SOON';
  available: false;
  name: string;
  image: ImageKey;
  imageAlt: string;
  imagePosition?: string;
  address: string;
  progressId: string;
  progressPercent: number;
  progressDelay: string;
  opening: string;
}

export type StudioLocation = OpenStudioLocation | UpcomingStudioLocation;

/**
 * Configurable studio details for Avinashi. Provide VITE_AVINASHI_ADDRESS,
 * VITE_AVINASHI_HOURS, and/or VITE_AVINASHI_MAPS_URL (or update this config)
 * once the official Avinashi studio details are ready.
 */
const avinashiAddress = import.meta.env.VITE_AVINASHI_ADDRESS?.trim() || '';
const avinashiHours = import.meta.env.VITE_AVINASHI_HOURS?.trim() || '';
const avinashiDirectionsHref =
  import.meta.env.VITE_AVINASHI_MAPS_URL?.trim() ||
  (avinashiAddress ? mapsUrl(avinashiAddress) : undefined);

/**
 * Single source of truth for studio locations, ordering, and availability
 * shared by the About Us page (StudioSection) and Book Your Look (BookingForm).
 */
export const studioLocations: readonly StudioLocation[] = [
  {
    id: 'avinashi',
    status: 'open',
    statusLabel: 'OPEN NOW',
    available: true,
    name: 'Avinashi',
    image: 'cocktail-home-after',
    imageAlt: 'Groom in a black and gold embroidered bandhgala at the Avinashi studio',
    imagePosition: 'center top',
    address: avinashiAddress || 'Avinashi, Tamil Nadu',
    hours: avinashiHours || undefined,
    directionsHref: avinashiDirectionsHref,
    bookHref: fittingHref,
  },
  {
    id: 'tiruppur-flagship',
    status: 'open',
    statusLabel: 'OPEN NOW',
    available: true,
    name: 'Tiruppur Flagship',
    image: 'threepiece',
    imageAlt: 'Groom in a sand beige three-piece suit at the Tiruppur flagship studio',
    address: contactConfig.address,
    hours: contactConfig.hours,
    directionsHref: mapsUrl(contactConfig.address),
    bookHref: fittingHref,
  },
  {
    id: 'coimbatore',
    status: 'upcoming',
    statusLabel: 'COMING SOON',
    available: false,
    name: 'Coimbatore',
    image: 'bandhgala-ivory',
    imageAlt: 'Groom in an ivory bandhgala',
    address: 'RS Puram, Coimbatore',
    progressId: 'coimbatore-progress',
    progressPercent: 70,
    progressDelay: '.35s',
    opening: 'Opening early 2027',
  },
];

/** Returns the studio only if it exists in the shared configuration and is currently OPEN NOW. */
export function findAvailableStudio(id: string | null | undefined): OpenStudioLocation | undefined {
  if (!id) return undefined;
  return studioLocations.find((studio): studio is OpenStudioLocation => studio.available && studio.id === id);
}
