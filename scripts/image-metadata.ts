import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
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

export function writeImageMetadata(root: string) {
  const directory = resolve(root, 'src/assets/images');
  const entries = readdirSync(directory).filter(file => file.endsWith('.webp')).sort().map(file => {
    const { width, height } = webpSize(readFileSync(resolve(directory, file)));
    return `  '${file.slice(0, -5)}': { width: ${width}, height: ${height} },`;
  });
  writeFileSync(resolve(root, 'src/data/imageMetadata.ts'), `// Original dimensions; generated without re-encoding any image.\nimport type { ImageKey } from './images';\n\nexport const imageMetadata = {\n${entries.join('\n')}\n} satisfies Record<ImageKey, { width: number; height: number }>;\n`);
}

if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) {
  writeImageMetadata(resolve(import.meta.dirname, '..'));
}
