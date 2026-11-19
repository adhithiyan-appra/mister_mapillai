import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const dist = join(root, 'dist');
const seo = JSON.parse(await readFile(join(root, 'src/data/seo.json'), 'utf8'));
const origin = new URL(process.env.SEO_SITE_URL || seo.siteUrl).origin;
const assets = new Set(await readdir(join(dist, 'assets')));
const tag = (markup, pattern) => markup.match(pattern)?.[1];
const canonicalFor = path => new URL(path, `${origin}/`).href;
const escaped = value => value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

for (const [path, entry] of Object.entries(seo.pages)) {
  const file = path === '/' ? join(dist, 'index.html') : join(dist, path.slice(1), 'index.html');
  const markup = await readFile(file, 'utf8');
  assert.equal(tag(markup, /<title>([^<]+)<\/title>/), escaped(entry.title), `${path} title`);
  assert.equal(tag(markup, /<meta name="description" content="([^"]+)"/), escaped(entry.description), `${path} description`);
  assert.equal(tag(markup, /<link rel="canonical" href="([^"]+)"/), canonicalFor(path), `${path} canonical`);
  assert.equal(tag(markup, /<meta property="og:url" content="([^"]+)"/), canonicalFor(path), `${path} Open Graph URL`);
  assert.equal(tag(markup, /<meta name="twitter:card" content="([^"]+)"/), 'summary_large_image', `${path} Twitter card`);
  const image = tag(markup, /<meta property="og:image" content="([^"]+)"/);
  assert.ok(image?.startsWith(`${origin}/assets/`), `${path} Open Graph image`);
  assert.ok(assets.has(image.split('/').at(-1)), `${path} Open Graph image exists`);
  assert.equal(markup.includes('content="noindex,follow"'), !entry.indexable, `${path} robots`);
  const data = tag(markup, /<script id="seo-structured-data" type="application\/ld\+json">([^<]+)<\/script>/);
  if (entry.indexable) {
    assert.ok(data, `${path} JSON-LD`);
    const schema = JSON.parse(data);
    assert.equal(schema['@context'], 'https://schema.org');
    assert.ok(schema['@graph'].some(node => node['@type'] === 'WebPage' && node.url === canonicalFor(path)));
  } else assert.equal(data, undefined, `${path} has no JSON-LD`);
}
const missing = await readFile(join(dist, '404.html'), 'utf8');
assert.ok(missing.includes('content="noindex,follow"'), '404 page must be noindex');
assert.ok(!missing.includes('rel="canonical"'), '404 page must not be canonical');
const sitemap = await readFile(join(dist, 'sitemap.xml'), 'utf8');
const sitemapUrls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
assert.deepEqual(sitemapUrls, Object.entries(seo.pages).filter(([, entry]) => entry.indexable).map(([path]) => canonicalFor(path)));
const robots = await readFile(join(dist, 'robots.txt'), 'utf8');
assert.ok(robots.includes(`Sitemap: ${origin}/sitemap.xml`));
assert.ok(!robots.includes('Disallow: /track-order'), 'noindex page must remain crawlable');
console.log(`SEO validation passed: ${Object.keys(seo.pages).length} route heads, ${sitemapUrls.length} sitemap URLs, social image, JSON-LD and robots.`);
