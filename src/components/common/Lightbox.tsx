import { useEffect, useRef } from 'react';
import type { ReactNode, TouchEvent } from 'react';
import type { ImageKey } from '../../data/images';
import { SourceImage } from './SourceImage';

export interface LightboxItem {
  image?: ImageKey;
  src?: string;
  width?: number;
  height?: number;
  title: string;
  caption?: string;
}

interface LightboxProps {
  items: readonly LightboxItem[];
  index: number | null;
  onChange: (index: number | null) => void;
  /** Extra content under the caption (e.g. a link to the look). */
  renderAction?: (item: LightboxItem, index: number) => ReactNode;
}

/** Modal image viewer on the native <dialog>: focus trap, Escape and backdrop close come built in. */
export function Lightbox({ items, index, onChange, renderAction }: LightboxProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const swiped = useRef(false);
  const open = index !== null && Boolean(items[index]);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (index === null) return;
      if (event.key === 'ArrowRight') onChange((index + 1) % items.length);
      if (event.key === 'ArrowLeft') onChange((index - 1 + items.length) % items.length);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, index, items.length, onChange]);

  const item = index !== null ? items[index] : undefined;
  const altText = item ? (item.caption ? `${item.title}: ${item.caption}` : item.title) : '';

  const handleTouchStart = (event: TouchEvent<HTMLDialogElement>) => {
    if (event.touches.length !== 1) return;
    touchStart.current = { x: event.touches[0].clientX, y: event.touches[0].clientY };
    swiped.current = false;
  };

  const handleTouchEnd = (event: TouchEvent<HTMLDialogElement>) => {
    if (!touchStart.current || index === null || items.length <= 1 || event.changedTouches.length !== 1) {
      touchStart.current = null;
      return;
    }
    const dx = event.changedTouches[0].clientX - touchStart.current.x;
    const dy = event.changedTouches[0].clientY - touchStart.current.y;
    touchStart.current = null;
    if (Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.2) {
      swiped.current = true;
      onChange(dx < 0 ? (index + 1) % items.length : (index - 1 + items.length) % items.length);
    }
  };

  const handleImageClick = () => {
    if (swiped.current) {
      swiped.current = false;
      return;
    }
    onChange(null);
  };

  return <dialog
    className="mm mm-lightbox"
    ref={ref}
    aria-label={item ? item.title : 'Image viewer'}
    onClose={() => onChange(null)}
    onClick={event => { if (event.target === event.currentTarget) onChange(null); }}
    onTouchStart={handleTouchStart}
    onTouchEnd={handleTouchEnd}
  >
    {item && index !== null ? <>
      <figure className="mm-lightbox__figure">
        {item.image
          ? <SourceImage asset={item.image} alt={altText} onClick={handleImageClick} />
          : item.src
            ? <img
              src={item.src}
              width={item.width}
              height={item.height}
              alt={altText}
              loading="eager"
              decoding="async"
              fetchPriority="high"
              onClick={handleImageClick}
            />
            : null}
        <figcaption>
          {items.length > 1 ? <small className="mm-lightbox__count">{index + 1} / {items.length}</small> : null}
          <b>{item.title}</b>
          {item.caption ? <span>{item.caption}</span> : null}
          {renderAction ? <div style={{ marginTop: 14 }}>{renderAction(item, index)}</div> : null}
        </figcaption>
      </figure>
      <button type="button" className="mm-lightbox__close" aria-label="Close" onClick={() => onChange(null)}>✕</button>
      {items.length > 1 ? <>
        <button type="button" className="mm-lightbox__nav mm-lightbox__nav--prev" aria-label="Previous image" onClick={() => onChange((index - 1 + items.length) % items.length)}>←</button>
        <button type="button" className="mm-lightbox__nav mm-lightbox__nav--next" aria-label="Next image" onClick={() => onChange((index + 1) % items.length)}>→</button>
      </> : null}
    </> : null}
  </dialog>;
}
