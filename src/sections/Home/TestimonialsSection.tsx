import { useCallback, useEffect, useRef, useState } from 'react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { SectionHeading } from '../../components/common/SectionHeading';
import { testimonials } from '../../data/testimonials';
import { heroPending, onHeroReady } from '../../utils/heroReady';
import { loadOurWorksImages } from './ourWorksGallery';
import type { OurWorkImage } from './ourWorksGallery';

const INTERVAL = 3000;

const GALLERY_PHOTOS = loadOurWorksImages();
const PHOTO_BY_FILE = new Map(GALLERY_PHOTOS.map(photo => [photo.filename.toLowerCase(), photo]));
// Avatars (64 px, 192 px on hover) use the gallery's small lossless rendition, not the full photograph.
const TESTIMONIAL_PHOTOS: OurWorkImage[] = testimonials.map((item, i) => (
  PHOTO_BY_FILE.get(item.galleryFile.toLowerCase()) ?? GALLERY_PHOTOS[i % GALLERY_PHOTOS.length]
)).filter((photo): photo is OurWorkImage => Boolean(photo));

export function TestimonialsSection() {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [openPreview, setOpenPreview] = useState<number | null>(null);
  const [cycle, setCycle] = useState(0);
  // The avatars are large gallery photos. On a first home visit they wait for the hero's
  // opening frames, so they do not share the network with them.
  const [photosOn, setPhotosOn] = useState(() => !heroPending());
  const ref = useRef<HTMLElement>(null);

  const blocked = paused;

  // Hover pauses only over the review itself and its dots, not the whole padded section,
  // so a resting cursor elsewhere on screen does not freeze the carousel.
  const pauseOnHover = useCallback((event: ReactPointerEvent) => {
    if (event.pointerType !== 'touch') setPaused(true);
  }, []);
  const resumeOnLeave = useCallback((event: ReactPointerEvent) => {
    if (event.pointerType !== 'touch') setPaused(false);
  }, []);

  const select = useCallback((index: number) => {
    setCurrent(index);
    setCycle(value => value + 1);
  }, []);

  const togglePreview = useCallback((index: number) => {
    if (window.matchMedia('(hover:hover)').matches) return;
    setOpenPreview(value => (value === index ? null : index));
  }, []);

  useEffect(() => {
    const section = ref.current;
    if (!section || testimonials.length < 2 || blocked) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let timer = 0;
    let visible = false;
    const schedule = () => {
      window.clearInterval(timer);
      if (visible && !document.hidden) {
        timer = window.setInterval(() => setCurrent(i => (i + 1) % testimonials.length), INTERVAL);
      }
    };
    const observer = new IntersectionObserver(entries => {
      visible = entries.some(entry => entry.isIntersecting);
      schedule();
    });
    observer.observe(section);
    document.addEventListener('visibilitychange', schedule);
    return () => {
      window.clearInterval(timer);
      observer.disconnect();
      document.removeEventListener('visibilitychange', schedule);
    };
  }, [blocked, cycle]);

  useEffect(() => {
    if (openPreview === null) return;
    const onPointerDown = (event: PointerEvent) => {
      if (event.target instanceof Element && event.target.closest(`[data-testi-avatar="${openPreview}"]`)) return;
      setOpenPreview(null);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [openPreview]);

  useEffect(() => {
    setOpenPreview(value => (value === null ? value : null));
  }, [current]);

  useEffect(() => onHeroReady(() => setPhotosOn(true)), []);

  useEffect(() => {
    const next = TESTIMONIAL_PHOTOS[(current + 1) % TESTIMONIAL_PHOTOS.length];
    if (!next || !photosOn) return;
    const image = new Image();
    image.decoding = 'async';
    image.src = next.smallSrc ?? next.src;
    void image.decode().catch(() => undefined);
  }, [current, photosOn]);

  if (!testimonials.length) return null;

  return <section
    className="mm-sec"
    id="testimonials"
    aria-labelledby="testi-title"
    ref={ref}
    onFocus={event => { if (event.target instanceof HTMLElement && event.target.matches(':focus-visible')) setPaused(true); }}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget)) setPaused(false); }}
  >
    <div className="mm-container">
      <SectionHeading id="testi-title" eyebrow="Kind Words" title={<>From Our <em>Grooms</em></>} />
      <div className="mm-testi-wrap" aria-roledescription="carousel" aria-label="Groom testimonials" onPointerEnter={pauseOnHover} onPointerLeave={resumeOnLeave}>
        {testimonials.map((item, i) => {
          const photo = TESTIMONIAL_PHOTOS[i];
          return <figure
            className={`mm-testi${i === current ? ' is-on' : ''}`}
            key={item.id}
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${testimonials.length}`}
            aria-hidden={i !== current}
          >
            <blockquote className="mm-testi__q"><p>{item.quote}</p></blockquote>
            <figcaption>
              {photo ? <button
                type="button"
                className={`mm-testi__av${openPreview === i ? ' is-preview-open' : ''}`}
                data-testi-avatar={i}
                aria-label={`${item.name} profile photo`}
                aria-expanded={openPreview === i}
                onPointerEnter={event => {
                  if (event.pointerType !== 'touch' && window.matchMedia('(hover:hover)').matches) setOpenPreview(i);
                }}
                onPointerLeave={event => {
                  if (event.pointerType !== 'touch') setOpenPreview(value => (value === i ? null : value));
                }}
                onClick={() => togglePreview(i)}
              >
                <span className="mm-testi__preview" aria-hidden="true">
                  <img
                    src={photosOn ? photo.smallSrc ?? photo.src : undefined}
                    width={photo.width}
                    height={photo.height}
                    alt=""
                    loading="eager"
                    decoding="async"
                    fetchPriority="low"
                    style={{ objectPosition: photo.objectPosition }}
                  />
                </span>
                <img
                  src={photosOn ? photo.smallSrc ?? photo.src : undefined}
                  width={photo.width}
                  height={photo.height}
                  alt={item.name}
                  loading="eager"
                  decoding="async"
                  fetchPriority={i === 0 ? 'auto' : 'low'}
                  style={{ objectPosition: photo.objectPosition }}
                />
              </button> : null}
              <cite className="mm-testi__who">{item.name}<span>{item.ceremony}</span></cite>
            </figcaption>
          </figure>;
        })}
      </div>
      <div className="mm-dots" role="group" aria-label="Choose a testimonial" onPointerEnter={pauseOnHover} onPointerLeave={resumeOnLeave}>
        {testimonials.map((item, i) => <button type="button" key={item.id} aria-label={`Show testimonial ${i + 1}: ${item.name}`} aria-current={i === current} onClick={() => select(i)} />)}
      </div>
    </div>
  </section>;
}
