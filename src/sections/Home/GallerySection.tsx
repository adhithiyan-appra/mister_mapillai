import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import type { SyntheticEvent } from 'react';
import { Lightbox } from '../../components/common/Lightbox';
import { SectionHeading } from '../../components/common/SectionHeading';
import { contactConfig } from '../../data/contact';
import { cssVars } from '../../utils/style';
import {
  getResponsiveColumns,
  loadOurWorksImages,
  packGalleryItems,
} from './ourWorksGallery';
import type { OurWorkImage, PlacedGalleryItem } from './ourWorksGallery';

const OUR_WORKS_ITEMS: OurWorkImage[] = loadOurWorksImages();

interface GalleryCardProps {
  item: PlacedGalleryItem;
  index: number;
  onOpen: (index: number) => void;
  onMeasure: (id: string, width: number, height: number) => void;
}

const GalleryCard = memo(function GalleryCard({ item, index, onOpen, onMeasure }: GalleryCardProps) {
  const handleLoad = useCallback((event: SyntheticEvent<HTMLImageElement>) => {
    const img = event.currentTarget;
    if (img.naturalWidth > 0 && img.naturalHeight > 0) {
      onMeasure(item.id, img.naturalWidth, img.naturalHeight);
    }
  }, [item.id, onMeasure]);

  return (
    <li
      className="mm-reveal mm-reveal--zoom mm-gal-item"
      style={{
        ...cssVars({ '--d': `${(index % 4) * 0.08}s` }),
        gridColumn: `${item.colStart} / span ${item.colSpan}`,
        gridRow: `${item.rowStart} / span ${item.rowSpan}`,
      }}
    >
      <button
        type="button"
        className="mm-gal"
        onClick={() => onOpen(index)}
        aria-label={`View ${item.title}`}
      >
        <img
          className="gallery-image"
          src={item.src}
          width={item.width}
          height={item.height}
          alt={item.title}
          loading="lazy"
          decoding="async"
          fetchPriority={index < 4 ? 'auto' : 'low'}
          data-gallery-lazy=""
          style={{ objectPosition: item.objectPosition }}
          onLoad={handleLoad}
        />
        <span className="mm-gal__overlay" aria-hidden="true" />
        <span className="mm-gal__badge" aria-hidden="true">↗</span>
        <span className="mm-gal__cap" aria-hidden="true">
          <span className="mm-gal__eyebrow">Real Groom</span>
          <span className="mm-gal__title">{item.title}</span>
        </span>
      </button>
    </li>
  );
});

export function GallerySection() {
  const [items, setItems] = useState<OurWorkImage[]>(OUR_WORKS_ITEMS);
  const [cols, setCols] = useState<2 | 3 | 4 | 5>(() => (
    typeof window === 'undefined' ? 4 : getResponsiveColumns(window.innerWidth, OUR_WORKS_ITEMS.length)
  ));
  const [open, setOpen] = useState<number | null>(null);

  useEffect(() => {
    const onResize = () => {
      const next = getResponsiveColumns(window.innerWidth, items.length);
      setCols(prev => (prev === next ? prev : next));
    };
    onResize();
    window.addEventListener('resize', onResize, { passive: true });
    return () => window.removeEventListener('resize', onResize);
  }, [items.length]);

  const onMeasure = useCallback((id: string, width: number, height: number) => {
    const measuredRatio = width / height;
    setItems(prev => {
      const idx = prev.findIndex(entry => entry.id === id);
      if (idx === -1) return prev;
      const current = prev[idx];
      if (
        current.width === width
        && current.height === height
        && Math.abs(current.aspectRatio - measuredRatio) <= 0.015
      ) {
        return prev;
      }
      const next = prev.slice();
      next[idx] = {
        ...current,
        width,
        height,
        aspectRatio: measuredRatio,
        objectPosition: current.width !== undefined
          ? current.objectPosition
          : (measuredRatio >= 1.2 ? '50% 24%' : '50% 14%'),
      };
      return next;
    });
  }, []);

  const packed = useMemo(() => packGalleryItems(items, cols), [items, cols]);
  const onOpen = useCallback((index: number) => setOpen(index), []);
  const onChange = useCallback((index: number | null) => setOpen(index), []);

  if (!packed.items.length) return null;

  return <section className="mm-sec mm-gallery" aria-labelledby="gallery-title">
    <div className="mm-container">
      <SectionHeading
        id="gallery-title"
        eyebrow="Real Grooms"
        title={<>Our <em>Mapillais</em></>}
        lead={<>Tap any photo to view. Follow <a href={contactConfig.instagram} target="_blank" rel="noopener noreferrer">{contactConfig.instagramHandle}</a></>}
      />
      <div className="mm-gal-wrap">
        <ul
          className="mm-gal-grid"
          style={cssVars({ '--gal-cols': cols, '--gal-rows': packed.totalRows })}
        >
          {packed.items.map((item, i) => (
            <GalleryCard
              key={item.id}
              item={item}
              index={i}
              onOpen={onOpen}
              onMeasure={onMeasure}
            />
          ))}
        </ul>
      </div>
    </div>
    <Lightbox
      items={packed.items}
      index={open}
      onChange={onChange}
    />
  </section>;
}
