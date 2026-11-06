import type { ImgHTMLAttributes } from 'react';
import type { ImageKey } from '../../data/images';
import { imageSource } from '../../data/imageSources';

interface SourceImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> {
  asset: ImageKey;
  alt: string;
  responsive?: boolean;
}

export function SourceImage({ asset, loading = 'lazy', sizes = '100vw', decoding = 'async', responsive = false, ...props }: SourceImageProps) {
  const source = imageSource(asset);
  const deferred = loading === 'lazy';
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
