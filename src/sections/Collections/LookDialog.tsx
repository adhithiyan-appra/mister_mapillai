import { useEffect, useRef } from 'react';
import { SourceImage } from '../../components/common/SourceImage';
import { bookingHref } from '../../data/navigation';
import { occasionText } from '../../data/outfits';
import type { DetailKind, Outfit } from '../../data/outfits';

const kindOrder: readonly DetailKind[] = ['clothing', 'accessory', 'footwear', 'finish'];

/** Full details of one look: the existing outfit record, grouped clothing → finish. */
export function LookDialog({ outfit, onClose }: { outfit: Outfit | undefined; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (outfit && !dialog.open) dialog.showModal();
    if (!outfit && dialog.open) dialog.close();
  }, [outfit]);

  const rows = outfit ? [...outfit.details].sort((a, b) => kindOrder.indexOf(a.kind) - kindOrder.indexOf(b.kind)) : [];
  return <dialog
    className="mm mm-dialog"
    ref={ref}
    aria-labelledby="look-dialog-title"
    onClose={() => { if (outfit) onClose(); }}
    onClick={event => { if (event.target === event.currentTarget) onClose(); }}
  >
    {outfit ? <div className="mm-dialog__grid">
      <div className="mm-dialog__media"><SourceImage asset={outfit.image} alt={`${outfit.title}: ${outfit.description}`} /></div>
      <div className="mm-dialog__body">
        <button type="button" className="mm-dialog__close" aria-label="Close details" onClick={onClose}>✕</button>
        <span className="mm-eyebrow">{occasionText(outfit)}</span>
        <h2 id="look-dialog-title">{outfit.title}</h2>
        <p>{outfit.description}</p>
        <ul className="mm-spec">{rows.map(row => <li key={row.label} data-kind={row.kind}><b>{row.label}</b><span>{row.value}</span></li>)}</ul>
        <div className="mm-btns">
          <a href={bookingHref(outfit.id)} className="mm-btn mm-btn--dark">Book This Look</a>
          <button type="button" className="mm-btn mm-btn--outline-dark" onClick={onClose}>Keep Browsing</button>
        </div>
      </div>
    </div> : null}
  </dialog>;
}
