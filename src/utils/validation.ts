export interface ConsultationValues {
  name: string;
  phone: string;
  email: string;
  date: string;
  consultDate?: string;
  city?: string;
  functions: string[];
  notes: string;
  /** Outfit id from the collections page ("Book this look"), or empty. */
  look: string;
}

export interface ConsultationErrors {
  name?: string;
  phone?: string;
  email?: string;
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateConsultation(values: ConsultationValues): ConsultationErrors {
  const email = values.email.trim();
  return {
    name: values.name.trim() ? undefined : 'Enter your name so we know who to call.',
    phone: values.phone.replace(/\D/g, '').length >= 10 ? undefined : 'Enter a 10-digit phone number.',
    email: !email ? undefined : emailPattern.test(email) ? undefined : 'Enter a valid email address.',
  };
}

export function consultationMessage(values: ConsultationValues, lookTitle?: string): string {
  const fns = values.functions.join(', ') || 'Not decided yet';
  const lines: string[] = ['Hello Mister Mapillai, I would like to book a fitting consultation.'];
  if (values.look && lookTitle) {
    lines.push(`Selected look: ${lookTitle}`);
  }
  lines.push(`Name: ${values.name.trim()}`);
  lines.push(`Phone: ${values.phone.trim()}`);
  lines.push(`Email: ${values.email.trim() || '-'}`);
  lines.push(`Date: ${values.date || 'Not fixed'}`);
  lines.push(`Functions: ${fns}`);
  lines.push(`Dream look: ${values.notes.trim() || '-'}`);
  return lines.join('\n');
}
