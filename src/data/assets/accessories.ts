/**
 * Accessory Orbit & Cut-Out Assets
 * Bespoke accessories styled head-to-toe with ceremony looks.
 */
import orbitBrooch from '../../assets/images/accessories/orbit/brooch.webp';
import orbitWatch from '../../assets/images/accessories/orbit/watch.webp';
import orbitPocketSquare from '../../assets/images/accessories/orbit/pocket-square.webp';
import orbitCufflinks from '../../assets/images/accessories/orbit/cufflinks.webp';
import orbitFootwear from '../../assets/images/accessories/orbit/footwear.webp';
// Lossless WebP versions (images/accessories/webp, made by scripts/convert-lossless-webp.py) of the PNG photographs in
// images/accessories/orbit, which stay there as the originals. The belt and trousers are 256 px renditions: the orbit shows them at 58 px.
import orbitGroom from '../../assets/images/accessories/webp/orbit-groom.webp';
import orbitGroomSm from '../../assets/images/accessories/webp/orbit-groom-sm.webp';
import orbitStole from '../../assets/images/accessories/webp/orbit-belt.webp';
import orbitTurban from '../../assets/images/accessories/webp/orbit-pant.webp';

export const accessoryAssets = {
  brooch: orbitBrooch,
  watch: orbitWatch,
  pocketSquare: orbitPocketSquare,
  cufflinks: orbitCufflinks,
  footwear: orbitFootwear,
  groom: orbitGroom,
  groomSm: orbitGroomSm,
  stole: orbitStole,
  turban: orbitTurban,
} as const;
