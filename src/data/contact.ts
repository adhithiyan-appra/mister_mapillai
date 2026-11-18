export interface ContactDetails {
  instagram: string;
  instagramHandle: string;
  whatsapp: string;
  phone: string;
  email: string;
  address: string;
  addressLines: readonly [string, string];
  hours: string;
}

export const contactConfig: ContactDetails = {
  instagram: 'https://instagram.com/mistermapillai',
  instagramHandle: '@mistermapillai',
  whatsapp: (import.meta.env.VITE_WHATSAPP_NUMBER || '919876500000').replace(/\D/g, ''),
  phone: import.meta.env.VITE_CONTACT_PHONE || '+91 98765 00000',
  email: import.meta.env.VITE_CONTACT_EMAIL || 'hello@mistermapillai.com',
  address: import.meta.env.VITE_CONTACT_ADDRESS || '14, Kumaran Road, Tiruppur, Tamil Nadu 641601',
  addressLines: ['14, Kumaran Road', 'Tiruppur, Tamil Nadu 641601'],
  hours: import.meta.env.VITE_CONTACT_HOURS || 'Mon – Sun · 10 AM – 9 PM',
};

export const consultationFunctions = [
  'Muhurtham',
  'Reception',
  'Engagement',
  'Sangeet',
  'Haldi',
  'Other',
] as const;

export const outfitCountOptions = [
  '1 (Groom only)',
  '2–3',
  '4–6 (with family)',
  '7+',
] as const;

export const budgetOptions = [
  '₹25,000 – ₹50,000',
  '₹50,000 – ₹1,00,000',
  '₹1,00,000 – ₹2,00,000',
  '₹2,00,000+',
] as const;

export const consultationModes = ['Studio Visit', 'Video Call'] as const;

export const timeSlotOptions = [
  '10 AM – 12 PM',
  '12 PM – 2 PM',
  '3 PM – 5 PM',
  '5 PM – 8 PM',
] as const;

export const bookingTrustPoints = [
  'No advance to book',
  'Free consultation',
  'Reply within 2 hours',
] as const;

/** How consultations work, as published on the contact page. */
export const appointmentNotes = [
  { title: 'By appointment', text: 'A one-to-one fitting with our stylists.' },
  { title: 'Plan ahead', text: 'Start two to three months before the wedding.' },
] as const;

/** WhatsApp chat link, or undefined when no studio number is configured. */
export function whatsappUrl(message?: string, details: ContactDetails = contactConfig): string | undefined {
  if (!details.whatsapp) return undefined;
  return `https://wa.me/${details.whatsapp}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
}

export function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, '')}`;
}

export function mapsUrl(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
}

export const generalEnquiry = 'Hi Mister Mapillai, I would like to know more about your groom wear.';
