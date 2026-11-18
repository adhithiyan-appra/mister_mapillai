import type { ImgHTMLAttributes } from 'react';
import type { ImageKey } from '../../data/images';
import { imageSource } from '../../data/imageSources';
import { heroPending } from '../../utils/heroReady';

interface SourceImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  asset: ImageKey;
  alt: string;
  responsive?: boolean;
}

export function SourceImage({ asset, loading = 'eager', sizes = '100vw', decoding = 'async', responsive = false, ...props }: SourceImageProps) {
  const source = imageSource(asset);
  // Deferred images get their source from the image loader. On a first home visit
  // every image waits for the hero's opening frames (see utils/heroReady).
  const deferred = loading === 'lazy' || heroPending();
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
