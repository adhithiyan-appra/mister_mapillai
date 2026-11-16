export interface ContactDetails {
  instagram: string;
  instagramHandle: string;
  whatsapp?: string;
  phone?: string;
  email?: string;
  address?: string;
  hours?: string;
}

export const contactConfig: ContactDetails = {
  instagram: 'https://www.instagram.com/mistermapillai',
  instagramHandle: '@mistermapillai',
  whatsapp: (import.meta.env.VITE_WHATSAPP_NUMBER ?? '').replace(/\D/g, ''),
  phone: import.meta.env.VITE_CONTACT_PHONE ?? '',
  email: import.meta.env.VITE_CONTACT_EMAIL ?? '',
  address: import.meta.env.VITE_CONTACT_ADDRESS ?? '',
  hours: import.meta.env.VITE_CONTACT_HOURS ?? '',
};

export const consultationFunctions = [
  'Nichayathartham',
  'Sangeet and Mehendi',
  'Mapillai Azhaippu',
  'Muhurtham',
  'Reception',
  'Family function',
] as const;
