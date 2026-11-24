import { SourceImage } from '../../components/common/SourceImage';
import { images } from '../../data/images';
import type { ImageKey } from '../../data/images';
import './CeremonyComparison.css';

/**
 * The display-size file of a photo where one exists (`<key>-view`, as the home page's Transformation section uses). The "after"
 * photos' own files are 6144x7680 (15-18 MB each, lossless); their -view files are 1120x1400 (1.3-1.8 MB, lossless), more than the
 * 240-400 CSS px this comparison is shown at needs even on a 3x screen. Measured: /ceremonies downloaded 53.5 MB for them.
 */
const viewKey = (asset: ImageKey): ImageKey => {
  const key = `${asset}-view`;
  return Object.hasOwn(images, key) ? key as ImageKey : asset;
};

interface CeremonyComparisonProps {
  id: string;
  category: string;
  title: string;
  beforeImage: ImageKey;
  afterImage: ImageKey;
  beforeDescription: string;
  afterDescription: string;
  active: boolean;
  sizes: string;
}

/**
 * Before / after arch for one ceremony. It has no state of its own: the
 * ceremony corridor writes the scroll-driven reveal into `--comparison-progress`
 * (0 = Before fully visible, divider at the left edge; 1 = After fully visible,
 * divider at the right edge). The After layer is clipped to the left of the
 * divider (a sliding, transform-only window), so scrolling down reveals it
 * from left to right without layout or repaint.
 */
export function CeremonyComparison({
  id,
  category,
  title,
  beforeImage,
  afterImage,
  beforeDescription,
  afterDescription,
  active,
  sizes,
}: CeremonyComparisonProps) {
  return <div
    className={`ceremony-compare${active ? ' is-active' : ''}`}
    data-ceremony-id={id}
    data-ceremony-category={category}
    data-before-image={beforeImage}
    data-after-image={afterImage}
    role="group"
    aria-label={`${title} (${category}): before, and with Mister Mapillai`}
    aria-hidden={!active}
  >
    <div className="ceremony-compare__layer ceremony-compare__layer--before">
      <SourceImage
        asset={viewKey(beforeImage)}
        sizes={sizes}
        className="ceremony-compare__image ceremony-compare__image--before"
        alt={`${title} before: ${beforeDescription}`}
        draggable={false}
      />
      <span className="ceremony-compare__label ceremony-compare__label--before" aria-hidden="true">Before</span>
    </div>
    <div className="ceremony-compare__layer ceremony-compare__layer--after">
      <div className="ceremony-compare__after-inner">
        <SourceImage
          asset={viewKey(afterImage)}
          sizes={sizes}
          className="ceremony-compare__image ceremony-compare__image--after"
          alt={`${title} with Mister Mapillai: ${afterDescription}`}
          draggable={false}
        />
        <span className="ceremony-compare__label ceremony-compare__label--after" aria-hidden="true">With Mister Mapillai</span>
      </div>
    </div>
    <span className="ceremony-compare__divider" aria-hidden="true">
      <span className="ceremony-compare__handle">
        <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
          <path d="M7 5L2.5 10L7 15M13 5L17.5 10L13 15" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </span>
  </div>;
}
