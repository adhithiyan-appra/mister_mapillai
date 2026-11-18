import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { SourceImage } from '../../components/common/SourceImage';
import {
  budgetOptions,
  consultationFunctions,
  consultationModes,
  outfitCountOptions,
  timeSlotOptions,
  whatsappUrl,
} from '../../data/contact';
import { saveOrder } from '../../data/orders';
import { outfitById, outfits } from '../../data/outfits';
import { cssVars } from '../../utils/style';

const steps = ['Details', 'Occasion', 'Style', 'Appointment'] as const;

interface StudioSelection {
  id: string;
  name: string;
  address: string;
}

interface StudioOption extends StudioSelection {
  status: string;
  description: string;
  available: boolean;
}

const studioOptions: readonly StudioOption[] = [
  {
    id: 'tiruppur-flagship',
    name: 'Tiruppur Flagship',
    address: '14, Kumaran Road, Tiruppur, Tamil Nadu 641601',
    status: 'OPEN NOW',
    description: '',
    available: true,
  },
  {
    id: 'coimbatore',
    name: 'Coimbatore',
    address: '',
    status: 'COMING SOON',
    description: 'Opening early 2027',
    available: false,
  },
  {
    id: 'erode',
    name: 'Erode',
    address: '',
    status: 'COMING SOON',
    description: 'Opening mid 2027',
    available: false,
  },
];

interface BookingValues {
  name: string;
  phone: string;
  city: string;
  email: string;
  events: string[];
  date: string;
  outfits: string;
  look: string;
  theme: string;
  budget: string;
  mode: typeof consultationModes[number];
  studio: StudioSelection | null;
  apptDate: string;
  slot: string;
  notes: string;
}

interface BookingErrors {
  name?: boolean;
  phone?: string;
  city?: boolean;
  events?: string;
  date?: boolean;
  apptDate?: boolean;
  studio?: string;
}

function today() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function emptyValues(look = ''): BookingValues {
  return {
    name: '',
    phone: '',
    city: '',
    email: '',
    events: [],
    date: '',
    outfits: outfitCountOptions[0],
    look,
    theme: '',
    budget: budgetOptions[0],
    mode: consultationModes[0],
    studio: null,
    apptDate: '',
    slot: timeSlotOptions[0],
    notes: '',
  };
}

export function BookingForm({ initialLook }: { initialLook?: string }) {
  const [values, setValues] = useState<BookingValues>(() => emptyValues(outfitById(initialLook)?.id ?? ''));
  const [errors, setErrors] = useState<BookingErrors>({});
  const [step, setStep] = useState(0);
  const [confirmed, setConfirmed] = useState<{ id: string; name: string; waLink: string } | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const moved = useRef(false);
  const minDate = today();

  const pickLooks = outfits.slice(0, 6);
  const selectedLookTitle = outfitById(values.look)?.title || 'To be designed';
  const selectedStudio = studioOptions.find(studio => studio.available && studio.id === values.studio?.id);

  useEffect(() => {
    const resolved = outfitById(initialLook);
    if (resolved) setValues(previous => ({ ...previous, look: resolved.id }));
  }, [initialLook]);

  useEffect(() => {
    if (!moved.current) { moved.current = true; return; }
    headingRef.current?.focus();
    const wrap = formRef.current?.closest('.mm-form-wrap');
    if (wrap && wrap.getBoundingClientRect().top < 0) wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [step, confirmed]);

  function update<K extends keyof BookingValues>(field: K, value: BookingValues[K]) {
    setValues(previous => ({ ...previous, [field]: value }));
    setErrors(previous => ({ ...previous, [field]: undefined }));
  }

  function toggleEvent(name: string, checked: boolean) {
    setValues(previous => ({
      ...previous,
      events: checked ? [...previous.events, name] : previous.events.filter(item => item !== name),
    }));
    setErrors(previous => ({ ...previous, events: undefined }));
  }

  function validStep(index: number): boolean {
    const next: BookingErrors = {};
    let ok = true;
    if (index === 0) {
      if (!values.name.trim()) { next.name = true; ok = false; }
      if (!/^[6-9]\d{9}$/.test(values.phone.trim())) {
        next.phone = 'Enter a valid 10-digit mobile number';
        ok = false;
      }
      if (!values.city.trim()) { next.city = true; ok = false; }
    } else if (index === 1) {
      if (!values.events.length) {
        next.events = 'Select at least one event';
        ok = false;
      }
      if (!values.date) { next.date = true; ok = false; }
    } else if (index === 3) {
      if (!values.apptDate) { next.apptDate = true; ok = false; }
      if (values.mode === 'Studio Visit' && !selectedStudio) {
        next.studio = 'Choose an available studio';
        ok = false;
      }
    }
    setErrors(next);
    return ok;
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validStep(step)) return;
    if (step < steps.length - 1) {
      setStep(step + 1);
      return;
    }

    const now = new Date();
    const id = `MM-${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}-${Math.floor(1000 + Math.random() * 9000)}`;
    const eventsText = values.events.join(', ');
    const apptText = `${values.apptDate}, ${values.slot}`;
    const order = {
      id,
      name: values.name.trim(),
      phone: values.phone.trim(),
      city: values.city.trim(),
      events: eventsText,
      date: values.date,
      outfits: values.outfits,
      look: selectedLookTitle,
      theme: values.theme.trim(),
      budget: values.budget,
      mode: values.mode,
      consultationMode: values.mode,
      ...(values.mode === 'Studio Visit' && selectedStudio ? {
        studio: {
          id: selectedStudio.id,
          name: selectedStudio.name,
          address: selectedStudio.address,
        },
      } : {}),
      appt: apptText,
      notes: values.notes.trim(),
      stage: 0,
      next: `${values.mode || 'Consultation'} on ${apptText}`,
      dates: [now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })],
    };

    saveOrder(order);

    const msg = [
      '*New Booking — Mister Mapillai*',
      `Order ID: ${order.id}`,
      `Name: ${order.name}`,
      `Mobile: ${order.phone}`,
      `City: ${order.city}`,
      `Events: ${order.events}`,
      `Wedding Date: ${order.date}`,
      `Outfits: ${order.outfits}`,
      `Look: ${order.look}`,
      `Theme: ${order.theme || '-'}`,
      `Budget: ${order.budget}`,
      `Consultation: ${order.mode} — ${order.appt}`,
      ...(order.studio ? [`Studio: ${order.studio.name} — ${order.studio.address}`] : []),
      `Notes: ${order.notes || '-'}`,
    ].join('\n');

    const waLink = whatsappUrl(msg) ?? '#';
    setConfirmed({ id, name: order.name, waLink });
    try { window.open(waLink, '_blank', 'noopener,noreferrer'); } catch { /* popup blocked */ }
  }

  const progress = confirmed ? 1 : step / (steps.length - 1);
  const reviewRows: readonly [string, string][] = [
    ['Name', values.name.trim()],
    ['Mobile', values.phone.trim()],
    ['Events', values.events.join(', ')],
    ['Wedding Date', values.date],
    ['Look', selectedLookTitle],
    ['Budget', values.budget],
    ...(values.mode === 'Studio Visit' && selectedStudio ? [['Studio', selectedStudio.name] as [string, string]] : []),
  ];

  return <div className="mm-form-wrap">
    <ol className="mm-steps" style={cssVars({ '--f': progress })} aria-label="Booking steps">
      <li className="mm-steps__track" aria-hidden="true"><div className="mm-steps__fill" /></li>
      {steps.map((label, i) => <li key={label} className={confirmed || i < step ? 'is-done' : i === step ? 'is-current' : ''} aria-current={!confirmed && i === step ? 'step' : undefined}>
        <div className="mm-steps__dot" aria-hidden="true">{confirmed || i < step ? '✓' : i + 1}</div>{label}
      </li>)}
    </ol>

    {confirmed ? <div className="mm-success" role="status">
      <div className="mm-seal" aria-hidden="true">✓</div>
      <span className="mm-eyebrow">Booking Received</span>
      <h3 ref={headingRef} tabIndex={-1} style={{ marginBottom: 0 }}>Thank you, {confirmed.name}</h3>
      <p style={{ color: 'var(--mm-muted)', marginTop: 10 }}>Your Order ID</p>
      <div className="mm-order-id" id="sId">{confirmed.id}</div>
      <p style={{ color: 'var(--mm-muted)', fontSize: 14, marginBottom: 26 }}>
        Send your booking to our stylist on WhatsApp to confirm your slot.<br />Save your Order ID to track anytime.
      </p>
      <div className="mm-btns">
        <a className="mm-btn mm-btn--wa" href={confirmed.waLink} target="_blank" rel="noopener noreferrer">Send on WhatsApp</a>
        <a className="mm-btn mm-btn--dark" href={`/track-order?q=${encodeURIComponent(confirmed.id)}`}>Track Order</a>
      </div>
    </div> : <form ref={formRef} noValidate onSubmit={onSubmit} aria-labelledby="booking-step-title">
      {step === 0 ? <div className="mm-fstep" key="details">
        <h3 id="booking-step-title" ref={headingRef} tabIndex={-1}>Your Details</h3>
        <div className="mm-field">
          <label htmlFor="nm">Full Name <em>*</em></label>
          <input
            id="nm"
            name="name"
            autoComplete="name"
            placeholder="Groom's name"
            required
            style={errors.name ? { borderColor: '#b33' } : undefined}
            value={values.name}
            onChange={event => update('name', event.target.value)}
          />
        </div>
        <div className="mm-row">
          <div className="mm-field">
            <label htmlFor="ph">Mobile Number <em>*</em></label>
            <input
              id="ph"
              name="phone"
              type="tel"
              maxLength={10}
              inputMode="numeric"
              autoComplete="tel"
              placeholder="10-digit mobile"
              required
              style={errors.phone ? { borderColor: '#b33' } : undefined}
              value={values.phone}
              onChange={event => update('phone', event.target.value)}
              aria-invalid={Boolean(errors.phone)}
              aria-describedby={errors.phone ? 'phoneErr' : undefined}
            />
            {errors.phone ? <span className="mm-err" id="phoneErr" role="alert">{errors.phone}</span> : null}
          </div>
          <div className="mm-field">
            <label htmlFor="ct">City <em>*</em></label>
            <input
              id="ct"
              name="city"
              autoComplete="address-level2"
              placeholder="e.g. Tiruppur"
              required
              style={errors.city ? { borderColor: '#b33' } : undefined}
              value={values.city}
              onChange={event => update('city', event.target.value)}
            />
          </div>
        </div>
        <div className="mm-field">
          <label htmlFor="em">Email (optional)</label>
          <input
            id="em"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={values.email}
            onChange={event => update('email', event.target.value)}
          />
        </div>
      </div> : null}

      {step === 1 ? <div className="mm-fstep" key="occasion">
        <h3 id="booking-step-title" ref={headingRef} tabIndex={-1}>The Occasion</h3>
        <fieldset className="mm-field">
          <legend className="mm-field__label">Events (select all that apply) <em>*</em></legend>
          <div className="mm-chips">
            {consultationFunctions.map(title => <label className="mm-chip" key={title}>
              <input
                type="checkbox"
                name="events"
                value={title}
                checked={values.events.includes(title)}
                onChange={event => toggleEvent(title, event.target.checked)}
              />
              <span>{title}</span>
            </label>)}
          </div>
          {errors.events ? <span className="mm-err" id="evErr" role="alert">{errors.events}</span> : null}
        </fieldset>
        <div className="mm-row">
          <div className="mm-field">
            <label htmlFor="dt">Wedding Date <em>*</em></label>
            <input
              id="dt"
              name="date"
              type="date"
              min={minDate}
              required
              style={errors.date ? { borderColor: '#b33' } : undefined}
              value={values.date}
              onChange={event => update('date', event.target.value)}
            />
          </div>
          <div className="mm-field">
            <label htmlFor="of">Number of Outfits</label>
            <select id="of" name="outfits" value={values.outfits} onChange={event => update('outfits', event.target.value)}>
              {outfitCountOptions.map(option => <option key={option} value={option}>{option}</option>)}
            </select>
          </div>
        </div>
      </div> : null}

      {step === 2 ? <div className="mm-fstep" key="style">
        <h3 id="booking-step-title" ref={headingRef} tabIndex={-1}>Your Style</h3>
        <fieldset className="mm-field">
          <legend className="mm-field__label">Pick a Look (optional)</legend>
          <div className="mm-look-pick">
            {pickLooks.map(outfit => <label className="mm-lp" key={outfit.id}>
              <input
                type="radio"
                name="look"
                value={outfit.id}
                checked={values.look === outfit.id}
                onClick={() => { if (values.look === outfit.id) update('look', ''); }}
                onChange={() => update('look', outfit.id)}
              />
              <div className="mm-lp__img"><SourceImage asset={outfit.thumbnail} alt="" responsive sizes="160px" /></div>
              <span>{outfit.title}</span>
            </label>)}
          </div>
        </fieldset>
        <div className="mm-field">
          <label htmlFor="th">Colour / Theme</label>
          <input
            id="th"
            name="theme"
            placeholder="e.g. Ivory & gold, royal maroon"
            value={values.theme}
            onChange={event => update('theme', event.target.value)}
          />
        </div>
        <div className="mm-field">
          <label htmlFor="bg">Budget Range</label>
          <select id="bg" name="budget" value={values.budget} onChange={event => update('budget', event.target.value)}>
            {budgetOptions.map(option => <option key={option} value={option}>{option}</option>)}
          </select>
        </div>
      </div> : null}

      {step === 3 ? <div className="mm-fstep" key="appointment">
        <h3 id="booking-step-title" ref={headingRef} tabIndex={-1}>Consultation</h3>
        <fieldset className="mm-field">
          <legend className="mm-field__label">Mode</legend>
          <div className="mm-chips">
            {consultationModes.map(mode => <label className="mm-chip" key={mode}>
              <input
                type="radio"
                name="mode"
                value={mode}
                checked={values.mode === mode}
                onChange={() => update('mode', mode)}
              />
              <span>{mode}</span>
            </label>)}
          </div>
        </fieldset>
        {values.mode === 'Studio Visit' ? <div className="mm-field">
          <div className="mm-field__label" id="studio-label">CHOOSE STUDIO <em>*</em></div>
          <div className="mm-studio-grid" role="group" aria-labelledby="studio-label" aria-describedby={errors.studio ? 'studioErr' : undefined} aria-invalid={Boolean(errors.studio)}>
            {studioOptions.map(studio => {
              const selected = selectedStudio?.id === studio.id;
              return <button
                type="button"
                className="mm-studio-card"
                key={studio.id}
                disabled={!studio.available}
                aria-pressed={studio.available ? selected : undefined}
                onClick={() => update('studio', { id: studio.id, name: studio.name, address: studio.address })}
              >
                <span className="mm-studio-card__heading">
                  <strong>{studio.name}</strong>
                  {selected ? <span className="mm-studio-card__check" aria-hidden="true">✓</span> : null}
                </span>
                <span className={`mm-studio-card__status${studio.available ? ' is-open' : ''}`}>{studio.status}</span>
                <span className="mm-studio-card__detail">{studio.address || studio.description}</span>
              </button>;
            })}
          </div>
          {errors.studio ? <span className="mm-err" id="studioErr" role="alert">{errors.studio}</span> : null}
        </div> : null}
        <div className="mm-row">
          <div className="mm-field">
            <label htmlFor="cd">Preferred Date <em>*</em></label>
            <input
              id="cd"
              name="apptDate"
              type="date"
              min={minDate}
              required
              style={errors.apptDate ? { borderColor: '#b33' } : undefined}
              value={values.apptDate}
              onChange={event => update('apptDate', event.target.value)}
            />
          </div>
          <div className="mm-field">
            <label htmlFor="cti">Time Slot</label>
            <select id="cti" name="slot" value={values.slot} onChange={event => update('slot', event.target.value)}>
              {timeSlotOptions.map(slot => <option key={slot} value={slot}>{slot}</option>)}
            </select>
          </div>
        </div>
        <div className="mm-field">
          <label htmlFor="nt">Notes</label>
          <textarea
            id="nt"
            name="notes"
            rows={2}
            placeholder="Anything we should know"
            value={values.notes}
            onChange={event => update('notes', event.target.value)}
          />
        </div>
        <div className="mm-review">
          <h4 id="review-title">Review</h4>
          <dl aria-labelledby="review-title">{reviewRows.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
        </div>
      </div> : null}

      <div className="mm-form-nav">
        <button type="button" className="mm-btn mm-btn--outline-dark" onClick={() => setStep(step - 1)} style={{ visibility: step > 0 ? 'visible' : 'hidden' }} aria-hidden={step === 0} tabIndex={step === 0 ? -1 : 0}>← Back</button>
        <button type="submit" className="mm-btn mm-btn--dark">
          {step < steps.length - 1 ? 'Continue →' : 'Confirm & Send ✓'}
        </button>
      </div>
    </form>}
  </div>;
}
