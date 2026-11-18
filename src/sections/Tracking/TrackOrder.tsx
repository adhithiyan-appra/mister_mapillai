import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { contactConfig, generalEnquiry, telHref, whatsappUrl } from '../../data/contact';
import { findOrders, trackingStages } from '../../data/orders';
import type { OrderRecord } from '../../data/orders';
import { fittingHref } from '../../data/navigation';
import { useRouter } from '../../router';
import { cssVars } from '../../utils/style';

const RING_CIRCUMFERENCE = 2 * Math.PI * 48;

export function TrackOrder() {
  const { search } = useRouter();
  const initialQuery = new URLSearchParams(search).get('q') ?? '';
  const [query, setQuery] = useState(initialQuery);
  const [error, setError] = useState('');
  const [results, setResults] = useState<OrderRecord[] | null>(() => (initialQuery ? findOrders(initialQuery) : null));
  const resultsRef = useRef<HTMLDivElement>(null);
  const chat = whatsappUrl(generalEnquiry);

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery);
      setResults(findOrders(initialQuery));
    }
  }, [initialQuery]);

  function runTrack(value: string) {
    const trimmed = value.trim();
    if (!trimmed) {
      setError('Enter your Order ID or mobile number');
      return;
    }
    setError('');
    setResults(findOrders(trimmed));
    requestAnimationFrame(() => {
      resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    runTrack(query);
  }

  function handleDemo(sample: string) {
    setQuery(sample);
    runTrack(sample);
  }

  return <>
    <div className="mm-form-wrap" style={{ maxWidth: 'none' }}>
      <form noValidate onSubmit={onSubmit} aria-labelledby="track-label">
        <div className="mm-field" style={{ margin: 0 }}>
          <label htmlFor="tQuery" id="track-label">Order ID or Mobile Number</label>
        </div>
        <div className="mm-search">
          <input
            id="tQuery"
            value={query}
            onChange={event => { setQuery(event.target.value); setError(''); }}
            placeholder="e.g. MM-1811-4207 or 9876543210"
            autoComplete="tel"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? 'tErr' : undefined}
          />
          <button type="submit" className="mm-btn mm-btn--dark">Track</button>
        </div>
        {error ? <span className="mm-err" id="tErr" role="alert">{error}</span> : null}
        <p className="mm-track-hint">
          Try a sample:{' '}
          <button type="button" className="mm-track-sample" onClick={() => handleDemo('MM-2611-0042')}>MM-2611-0042</button>
          {' · '}
          <button type="button" className="mm-track-sample" onClick={() => handleDemo('9876543210')}>9876543210</button>
        </p>
      </form>
    </div>

    <div ref={resultsRef}>
      {results !== null && results.length === 0 ? <div className="mm-track-card" style={{ padding: 44, textAlign: 'center' }} role="status">
        <h3 style={{ color: 'var(--mm-maroon)', fontSize: 28 }}>No orders found</h3>
        <p style={{ color: 'var(--mm-muted)', marginTop: 8 }}>
          Check your Order ID or number, or <a href={fittingHref} style={{ color: 'var(--mm-gold-deep)', textDecoration: 'underline' }}>book your look</a>.
        </p>
      </div> : null}

      {results?.map(order => {
        const days = Math.max(0, Math.ceil((new Date(order.date).getTime() - Date.now()) / 864e5));
        const pct = Math.round((order.stage / (trackingStages.length - 1)) * 100);
        const offset = RING_CIRCUMFERENCE * (1 - pct / 100);
        const rescheduleHref = whatsappUrl(`Hi, I want to reschedule for order ${order.id}`);

        return <div className="mm-track-card" key={order.id}>
          <div className="mm-track-head mm-track-head--flex">
            <div>
              <span className="mm-eyebrow" style={{ margin: 0 }}>{order.id}</span>
              <h3>{order.name}</h3>
              <p style={{ fontSize: 13, opacity: 0.85 }}>{order.events} · {days} days to the wedding</p>
            </div>
            <div className="mm-ring-prog" aria-label={`${pct}% Complete`}>
              <svg width="110" height="110" aria-hidden="true">
                <circle className="mm-ring-prog__bg" cx="55" cy="55" r="48" />
                <circle
                  className="mm-ring-prog__fg"
                  cx="55"
                  cy="55"
                  r="48"
                  strokeDasharray={RING_CIRCUMFERENCE}
                  strokeDashoffset={offset}
                />
              </svg>
              <div>
                <b>{pct}%</b>
                <span>Complete</span>
              </div>
            </div>
          </div>

          <div className="mm-track-meta">
            <div><small>Look</small><b>{order.look}</b></div>
            <div><small>Wedding Date</small><b>{order.date}</b></div>
            <div><small>Outfits</small><b>{order.outfits}</b></div>
          </div>

          <ol className="mm-timeline mm-track-body">
            {trackingStages.map((stage, i) => {
              const stateClass = i < order.stage ? ' is-done' : i === order.stage ? ' is-current' : '';
              return <li className={`mm-tl-item${stateClass}`} style={cssVars({ '--i': i })} key={stage.title}>
                <div className="mm-tl-dot" aria-hidden="true">{i < order.stage ? '✓' : i + 1}</div>
                <div>
                  <h4 className="mm-tl-title">{stage.title}</h4>
                  <p>{stage.description}</p>
                  {order.dates[i] ? <div className="mm-tl-when">{order.dates[i]}</div> : null}
                </div>
              </li>;
            })}
          </ol>

          <div className="mm-next-box">
            <div>
              <span className="mm-eyebrow" style={{ margin: 0 }}>Next Step</span>
              <b style={{ color: 'var(--mm-maroon)' }}>{order.next}</b>
            </div>
            {rescheduleHref ? <a href={rescheduleHref} target="_blank" rel="noopener noreferrer" className="mm-btn mm-btn--outline-dark mm-btn--sm">Reschedule</a> : null}
          </div>
        </div>;
      })}
    </div>

    <div className="mm-help">
      {chat ? <a className="mm-btn mm-btn--wa" href={chat} target="_blank" rel="noopener noreferrer">Chat with your Stylist</a> : null}
      <a className="mm-btn mm-btn--dark" href={telHref(contactConfig.phone)}>Call the Studio</a>
    </div>
  </>;
}
