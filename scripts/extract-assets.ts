import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { writeImageMetadata } from './image-metadata.ts';

const sourcePath = process.argv[2] ?? 'C:/Users/Drago/Downloads/mister-mapillai-3d-preview 2.html';
const source = readFileSync(sourcePath, 'utf8');
const root = resolve(import.meta.dirname, '..');
for (const dir of ['src/assets/images', 'src/assets/fonts', 'src/assets/logo', 'src/styles', 'src/data', 'reference']) {
  mkdirSync(resolve(root, dir), { recursive: true });
}
const imageMatch = source.match(/const IMG=(\{[^\n]+\});/);
if (!imageMatch) throw new Error('Original image map was not found.');
const images = JSON.parse(imageMatch[1]) as Record<string, string>;
const replacements = new Map<string, string>();
const hashes: Record<string, string> = {};
for (const [name, data] of Object.entries(images)) {
  const match = data.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!match) throw new Error(`Invalid original image: ${name}`);
  const bytes = Buffer.from(match[2], 'base64');
  const path = `src/assets/images/${name}.${match[1]}`;
  writeFileSync(resolve(root, path), bytes);
  replacements.set(data, path);
  hashes[name] = createHash('sha256').update(bytes).digest('hex');
}
let css = source.match(/<style>([\s\S]*?)<\/style>/)![1];
let fontCount = 0;
css = css.replace(/@font-face\{[^}]+\}/g, (rule) => {
  const family = rule.match(/font-family:"([^"]+)"/)![1];
  const weight = rule.match(/font-weight:(\d+)/)![1];
  const italic = rule.includes('font-style:italic') ? '-italic' : '';
  const data = rule.match(/data:font\/woff2;base64,([A-Za-z0-9+/=]+)/)![1];
  const name = `${family.toLowerCase().replaceAll(' ', '-')}-${weight}${italic}.woff2`;
  writeFileSync(resolve(root, `src/assets/fonts/${name}`), Buffer.from(data, 'base64'));
  fontCount++;
  return rule.replace(`data:font/woff2;base64,${data}`, `../assets/fonts/${name}`);
});
// Keep the original stylesheet intact; utility CSS is separate and has no preflight.
writeFileSync(resolve(root, 'src/styles/original.css'), css.trim() + '\n');
const seal = source.match(/<template id="sealArt">\s*([\s\S]*?)\s*<\/template>/)![1];
writeFileSync(resolve(root, 'src/assets/logo/seal.svg'), seal.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" '));
const imports = Object.keys(images).map((name, i) => `import image${i} from '../assets/images/${name}.webp';`);
const entries = Object.keys(images).map((name, i) => `  '${name}': image${i},`);
writeFileSync(resolve(root, 'src/data/images.ts'), `${imports.join('\n')}\n\nexport const images = {\n${entries.join('\n')}\n} as const;\n\nexport type ImageKey = keyof typeof images;\n`);
writeImageMetadata(root);
let readable = source;
for (const [data, path] of replacements) readable = readable.replaceAll(data, path);
readable = readable.replace(/data:font\/woff2;base64,[A-Za-z0-9+/=]+/g, '[original embedded font; extracted to src/assets/fonts]');
writeFileSync(resolve(root, 'reference/source-analysis.html'), readable);
writeFileSync(resolve(root, 'reference/original.html'), source);
writeFileSync(resolve(root, 'reference/asset-manifest.json'), JSON.stringify({ source: sourcePath, sourceSha256: createHash('sha256').update(source).digest('hex'), images: hashes, fontCount }, null, 2) + '\n');
console.log(`Extracted ${Object.keys(images).length} original images, ${fontCount} WOFF2 fonts, seal SVG and exact CSS.`);
