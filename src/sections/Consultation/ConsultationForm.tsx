import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { LotusOrnament } from '../../components/common/LotusOrnament';
import { contactConfig, consultationFunctions } from '../../data/contact';
import { consultationMessage, validateConsultation } from '../../utils/validation';
import type { ConsultationErrors, ConsultationValues } from '../../utils/validation';

export function ConsultationForm() {
  const [values, setValues] = useState<ConsultationValues>(() => ({
    name: '',
    phone: '',
    email: '',
    date: '',
    consultDate: '',
    city: '',
    functions: [],
    notes: '',
    look: '',
  }));

  const [errors, setErrors] = useState<ConsultationErrors>({});
  const [status, setStatus] = useState('');
  const [tone, setTone] = useState<'ok' | 'bad' | ''>('');
  const ref = useRef<HTMLFormElement>(null);

  function update(field: Exclude<keyof ConsultationValues, 'functions'>, value: string) {
    setValues(previous => ({ ...previous, [field]: value }));
    setStatus('');
    setTone('');
    if (field === 'name' || field === 'phone' || field === 'email') {
      setErrors(previous => ({ ...previous, [field]: undefined }));
    }
  }

  function toggleFunction(title: string, checked: boolean) {
    setValues(previous => ({
      ...previous,
      functions: checked
        ? [...previous.functions, title]
        : previous.functions.filter(item => item !== title),
    }));
    setStatus('');
    setTone('');
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextErrors = validateConsultation(values);
    setErrors(nextErrors);
    setStatus('');
    setTone('');

    const firstInvalid = (['name', 'phone', 'email'] as const).find(field => nextErrors[field]);
    if (firstInvalid) {
      const fieldId = firstInvalid === 'name' ? 'nm' : firstInvalid === 'phone' ? 'ph' : 'em';
      ref.current?.querySelector<HTMLInputElement>(`#${fieldId}`)?.focus();
      return;
    }

    const message = consultationMessage(values);
    if (contactConfig.whatsapp) {
      window.open(`https://wa.me/${contactConfig.whatsapp}?text=${encodeURIComponent(message)}`, '_blank', 'noopener,noreferrer');
      setTone('ok');
      setStatus('Your request is ready in WhatsApp. Press send to reach us.');
      return;
    }

    try {
      await navigator.clipboard.writeText(message);
      setTone('ok');
      setStatus('Request copied. Paste it into our Instagram messages to send.');
    } catch {
      setTone('bad');
      setStatus('Send us these details on Instagram and we will reply.');
    }
  }

  return (
    <div className="enq">
      <div className="head">
        <LotusOrnament align="left" />
        <h2>Consultation enquiry</h2>
        <p>Share a few details and we’ll get in touch to confirm your fitting.</p>
      </div>

      <form id="form" ref={ref} noValidate onSubmit={submit}>
        <div className="f">
          <label htmlFor="nm">Name <em>*</em></label>
          <input
            id="nm"
            name="name"
            autoComplete="name"
            placeholder="Your full name"
            required
            value={values.name}
            onChange={event => update('name', event.target.value)}
            aria-invalid={Boolean(errors.name)}
            aria-describedby="nmErr"
          />
          <span className="err" id="nmErr" data-err="name" role={errors.name ? 'alert' : undefined}>
            {errors.name}
          </span>
        </div>

        <div className="f">
          <label htmlFor="ph">Phone or WhatsApp <em>*</em></label>
          <input
            id="ph"
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="Your mobile number"
            required
            value={values.phone}
            onChange={event => update('phone', event.target.value)}
            aria-invalid={Boolean(errors.phone)}
            aria-describedby="phErr"
          />
          <span className="err" id="phErr" data-err="phone" role={errors.phone ? 'alert' : undefined}>
            {errors.phone}
          </span>
        </div>

        <div className="f">
          <label htmlFor="em">Email</label>
          <input
            id="em"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="Your email address"
            value={values.email}
            onChange={event => update('email', event.target.value)}
            aria-invalid={Boolean(errors.email)}
            aria-describedby="emErr"
          />
          <span className="err" id="emErr" data-err="email" role={errors.email ? 'alert' : undefined}>
            {errors.email}
          </span>
        </div>

        <div className="f">
          <label htmlFor="dt">Wedding or event date</label>
          <input
            id="dt"
            name="date"
            type="date"
            value={values.date}
            onChange={event => update('date', event.target.value)}
          />
        </div>

        <div className="f full">
          <span className="lbl" id="fnLbl">Functions you need outfits for</span>
          <div className="chips" role="group" aria-labelledby="fnLbl" id="chips">
            {consultationFunctions.map(title => (
              <label key={title}>
                <input
                  type="checkbox"
                  name="functions"
                  value={title}
                  checked={values.functions.includes(title)}
                  onChange={event => toggleFunction(title, event.target.checked)}
                />
                <span>{title}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="f full">
          <label htmlFor="nt">Your dream look</label>
          <textarea
            id="nt"
            name="notes"
            placeholder="Theme, colours, the feel you want. For example: temple theme in ivory and gold, reception in an ivory suit"
            value={values.notes}
            onChange={event => update('notes', event.target.value)}
          />
        </div>

        <div className="form-foot">
          <button className="btn solid" type="submit">Request consultation</button>
          <a
            className="btn line"
            href={contactConfig.instagram}
            target="_blank"
            rel="noopener noreferrer"
          >
            Message on Instagram
          </a>
          <span className={`status${tone ? ` ${tone}` : ''}`} id="status" role="status">
            {status}
          </span>
        </div>
      </form>
    </div>
  );
}
