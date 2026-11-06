import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { Button } from '../../components/common/Button';
import { ceremonies } from '../../data/ceremonies';
import { consultationMessage, validateConsultation } from '../../utils/validation';
import type { ConsultationErrors, ConsultationValues } from '../../utils/validation';

const initialValues: ConsultationValues = { name: '', phone: '', date: '', city: '', functions: [], notes: '' };
const whatsapp = (import.meta.env.VITE_WHATSAPP_NUMBER ?? '').replace(/\D/g, '');

export function ConsultationForm() {
  const [values, setValues] = useState<ConsultationValues>(initialValues);
  const [errors, setErrors] = useState<ConsultationErrors>({});
  const [status, setStatus] = useState('');
  const ref = useRef<HTMLFormElement>(null);

  function update(field: Exclude<keyof ConsultationValues, 'functions'>, value: string) {
    setValues(previous => ({ ...previous, [field]: value }));
    setStatus('');
    if (field === 'name' || field === 'phone') setErrors(previous => ({ ...previous, [field]: undefined }));
  }

  function toggleFunction(title: string, checked: boolean) {
    setValues(previous => ({ ...previous, functions: checked ? [...previous.functions, title] : previous.functions.filter(item => item !== title) }));
    setStatus('');
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateConsultation(values);
    setErrors(nextErrors);
    setStatus('');
    if (nextErrors.name || nextErrors.phone) {
      ref.current?.querySelector<HTMLInputElement>(nextErrors.name ? '#nm' : '#ph')?.focus();
      return;
    }
    const message = consultationMessage(values);
    if (whatsapp) {
      window.open(`https://wa.me/${whatsapp}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
      setStatus('Request opened in WhatsApp. Press send to reach us.');
      return;
    }
    try {
      await navigator.clipboard.writeText(message);
      setStatus('Request copied. Paste it into our Instagram messages to send.');
    } catch {
      setStatus('Send us these details on Instagram and we will reply.');
    }
  }

  return <form id="form" ref={ref} noValidate onSubmit={submit}>
    <div className="f"><label htmlFor="nm">Your name</label><input id="nm" name="name" autoComplete="name" required value={values.name} onChange={event => update('name', event.target.value)} aria-invalid={Boolean(errors.name)} aria-describedby="nmErr" /><span className="err" id="nmErr">{errors.name}</span></div>
    <div className="f"><label htmlFor="ph">Phone or WhatsApp</label><input id="ph" name="phone" type="tel" autoComplete="tel" required value={values.phone} onChange={event => update('phone', event.target.value)} aria-invalid={Boolean(errors.phone)} aria-describedby="phErr" /><span className="err" id="phErr">{errors.phone}</span></div>
    <div className="f"><label htmlFor="dt">Wedding or event date</label><input id="dt" name="date" type="date" value={values.date} onChange={event => update('date', event.target.value)} /></div>
    <div className="f"><label htmlFor="ct">City</label><input id="ct" name="city" autoComplete="address-level2" value={values.city} onChange={event => update('city', event.target.value)} /></div>
    <div className="f full"><span className="lbl" id="fnLbl">Functions you need outfits for</span><div className="chips" role="group" aria-labelledby="fnLbl" id="chips">
      {ceremonies.map(ceremony => <label key={ceremony.title}><input type="checkbox" name="functions" value={ceremony.title} checked={values.functions.includes(ceremony.title)} onChange={event => toggleFunction(ceremony.title, event.target.checked)} /><span>{ceremony.title}</span></label>)}
    </div></div>
    <div className="f full"><label htmlFor="nt">Theme, colours or anything else</label><textarea id="nt" name="notes" placeholder="For example: temple theme in ivory and gold, reception in a navy suit" value={values.notes} onChange={event => update('notes', event.target.value)} /></div>
    <div className="form-foot">
      <button className="btn solid" type="submit">Send request</button>
      <Button variant="line" href="https://www.instagram.com/mistermapillai" target="_blank" rel="noopener noreferrer">Message on Instagram</Button>
      <span className="status" id="status" role="status">{status}</span>
    </div>
  </form>;
}
