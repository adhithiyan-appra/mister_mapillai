import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

function webpSize(bytes: Buffer): { width: number; height: number } {
  if (bytes.toString('ascii', 0, 4) !== 'RIFF' || bytes.toString('ascii', 8, 12) !== 'WEBP') {
    throw new Error('Expected an original WebP image.');
  }
  for (let offset = 12; offset + 8 <= bytes.length;) {
    const chunk = bytes.toString('ascii', offset, offset + 4);
    const size = bytes.readUInt32LE(offset + 4), data = offset + 8;
    if (data + size > bytes.length) throw new Error('Truncated WebP image.');
    if (chunk === 'VP8X') return { width: bytes.readUIntLE(data + 4, 3) + 1, height: bytes.readUIntLE(data + 7, 3) + 1 };
    if (chunk === 'VP8 ') return { width: bytes.readUInt16LE(data + 6) & 0x3fff, height: bytes.readUInt16LE(data + 8) & 0x3fff };
    if (chunk === 'VP8L') {
      const bits = bytes.readUInt32LE(data + 1);
      return { width: (bits & 0x3fff) + 1, height: ((bits >>> 14) & 0x3fff) + 1 };
    }
    offset = data + size + (size % 2);
  }
  throw new Error('WebP image dimensions were not found.');
}

/**
 * The folders under src/assets/images that hold the registry's images (their file names are the image keys).
 * The other folders (about/our-story, accessories, real-grooms/gallery) are keyed differently in data/assets/*.
 */
const KEYED_IMAGE_FOLDERS = [
  'collections/looks', 'collections/wide', 'home/before-after', 'testimonials',
  'real-grooms/happy-groom-story', 'about/how-we-make', 'shared/devatan-shirt', 'shared/design-boards',
];

export function writeImageMetadata(root: string) {
  const files = KEYED_IMAGE_FOLDERS.flatMap(folder => {
    const directory = resolve(root, 'src/assets/images', folder);
    return readdirSync(directory).filter(file => file.endsWith('.webp')).map(file => resolve(directory, file));
  });
  const entries = files
    .map(file => ({ name: basename(file, '.webp'), file }))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map(({ name, file }) => {
      const { width, height } = webpSize(readFileSync(file));
      return `  '${name}': { width: ${width}, height: ${height} },`;
    });
  writeFileSync(resolve(root, 'src/data/imageMetadata.ts'), `// Original dimensions; generated without re-encoding any image.\nimport type { ImageKey } from './images';\n\nexport const imageMetadata = {\n${entries.join('\n')}\n} satisfies Record<ImageKey, { width: number; height: number }>;\n`);
}

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  writeImageMetadata(resolve(import.meta.dirname, '..'));
}
