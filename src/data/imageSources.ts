import { images } from './images';
import type { ImageKey } from './images';
import { imageMetadata } from './imageMetadata';

function isImageKey(key: string): key is ImageKey {
  return Object.hasOwn(images, key);
}

export function imageSource(asset: ImageKey) {
  const base = asset.endsWith('-sm') ? asset.slice(0, -3) : asset;
  const full = isImageKey(base) ? base : asset;
  const small = `${full}-sm`;
  const dimensions = imageMetadata[full];
  return {
    src: images[full],
    ...dimensions,
    srcSet: isImageKey(small)
      ? `${images[small]} ${imageMetadata[small].width}w, ${images[full]} ${dimensions.width}w`
      : undefined,
  };
}
