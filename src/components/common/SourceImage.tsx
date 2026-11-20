import type { ImgHTMLAttributes } from 'react';
import type { ImageKey } from '../../data/images';
import { imageSource } from '../../data/imageSources';
import { heroPending } from '../../utils/heroReady';

interface SourceImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  asset: ImageKey;
  alt: string;
  responsive?: boolean;
  /**
   * With loading="lazy": let the browser defer the image natively (src is set and it loads when the image nears the
   * viewport) instead of waiting for the page's image loader. Use it for lists that re-render (filters, selections):
   * the loader prepares a section once, so images added to it later would otherwise never get a source.
   */
  nativeLazy?: boolean;
}

export function SourceImage({ asset, loading = 'eager', sizes = '100vw', decoding = 'async', responsive = false, nativeLazy = false, ...props }: SourceImageProps) {
  const source = imageSource(asset);
  // Deferred images get their source from the image loader. On a first home visit
  // every image waits for the hero's opening frames (see utils/heroReady).
  const deferred = (loading === 'lazy' && !nativeLazy) || heroPending();
  return <img
    width={source.width}
    height={source.height}
    src={deferred ? undefined : source.src}
    srcSet={deferred || !responsive ? undefined : source.srcSet}
    sizes={responsive && source.srcSet ? sizes : undefined}
    data-image-src={deferred ? source.src : undefined}
    data-image-srcset={deferred && responsive ? source.srcSet : undefined}
    loading={loading}
    decoding={decoding}
    {...props}
  />;
}
