export interface ConsultationValues {
  name: string;
  phone: string;
  date: string;
  city: string;
  functions: string[];
  notes: string;
}

export interface ConsultationErrors { name?: string; phone?: string }

export function validateConsultation(values: ConsultationValues): ConsultationErrors {
  return {
    name: values.name.trim() ? undefined : 'Enter your name so we know who to call.',
    phone: values.phone.replace(/\D/g, '').length >= 10 ? undefined : 'Enter a 10-digit phone number.',
  };
}

export function consultationMessage(values: ConsultationValues): string {
  return `Hello Mister Mapillai, I would like to book a fitting consultation.\nName: ${values.name.trim()}\nPhone: ${values.phone.trim()}\nDate: ${values.date || 'Not fixed'}\nCity: ${values.city || '-'}\nFunctions: ${values.functions.join(', ') || 'Not decided yet'}\nNotes: ${values.notes || '-'}`;
}
