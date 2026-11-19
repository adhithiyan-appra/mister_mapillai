import { readFile, readdir, mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';
import { loadEnv } from 'vite';

const root = resolve(import.meta.dirname, '..');
const dist = join(root, 'dist');
const seo = JSON.parse(await readFile(join(root, 'src/data/seo.json'), 'utf8'));
const env = loadEnv('production', root, 'SEO_');
const configuredUrl = process.env.SEO_SITE_URL || env.SEO_SITE_URL || seo.siteUrl;
const parsedUrl = new URL(configuredUrl);
if (parsedUrl.protocol !== 'https:' || parsedUrl.pathname !== '/' || parsedUrl.search || parsedUrl.hash) {
  throw new Error('SEO_SITE_URL must be an HTTPS origin, for example https://example.com');
}
const origin = parsedUrl.origin;
const sourceHtml = (await readFile(join(dist, 'index.html'), 'utf8'))
  .replace(/<!-- SEO_START -->[\s\S]*?<!-- SEO_END -->/g, '');
const assets = await readdir(join(dist, 'assets'));
const socialAsset = assets.find(name => /^happy-grooms-hero-[^.]+\.webp$/.test(name));
if (!socialAsset) throw new Error('The existing social preview image was not included in the build.');
const socialImage = `${origin}/assets/${socialAsset}`;

const html = value => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]);
const xml = html;
const pageUrl = path => new URL(path, `${origin}/`).href;
const json = value => JSON.stringify(value).replace(/</g, '\\u003c');

function schemaFor(path, entry) {
  if (!entry?.indexable) return null;
  const url = pageUrl(path);
  const graph = [];
  if (path === '/') graph.push(
    { '@type': 'Organization', '@id': `${origin}/#organization`, name: seo.siteName, url: `${origin}/`, logo: `${origin}/seal.svg` },
    { '@type': 'WebSite', '@id': `${origin}/#website`, name: seo.siteName, url: `${origin}/`, publisher: { '@id': `${origin}/#organization` } },
  );
  graph.push({ '@type': 'WebPage', '@id': `${url}#webpage`, url, name: entry.title, description: entry.description, isPartOf: { '@id': `${origin}/#website` } });
  if (path !== '/') graph.push({
    '@type': 'BreadcrumbList', '@id': `${url}#breadcrumb`,
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
      { '@type': 'ListItem', position: 2, name: entry.breadcrumb, item: url },
    ],
  });
  return { '@context': 'https://schema.org', '@graph': graph };
}

function render(path, entry) {
  const url = pageUrl(path);
  const tags = [
    '<!-- SEO_START -->',
    path === '/404' ? '' : `<link rel="canonical" href="${html(url)}" />`,
    entry.indexable ? '' : '<meta name="robots" content="noindex,follow" />',
    '<meta property="og:type" content="website" />',
    `<meta property="og:site_name" content="${html(seo.siteName)}" />`,
    `<meta property="og:title" content="${html(entry.title)}" />`,
    `<meta property="og:description" content="${html(entry.description)}" />`,
    `<meta property="og:url" content="${html(url)}" />`,
    `<meta property="og:image" content="${html(socialImage)}" />`,
    '<meta property="og:image:alt" content="Mister Mapillai bespoke groom wear" />',
    '<meta name="twitter:card" content="summary_large_image" />',
    `<meta name="twitter:title" content="${html(entry.title)}" />`,
    `<meta name="twitter:description" content="${html(entry.description)}" />`,
    `<meta name="twitter:image" content="${html(socialImage)}" />`,
    schemaFor(path, entry) ? `<script id="seo-structured-data" type="application/ld+json">${json(schemaFor(path, entry))}</script>` : '',
    '<!-- SEO_END -->',
  ].filter(Boolean).join('\n    ');
  return sourceHtml
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${html(entry.title)}</title>`)
    .replace(/<meta name="description"[^>]*>/, `<meta name="description" content="${html(entry.description)}" />`)
    .replace('</head>', `    ${tags}\n  </head>`);
}

for (const [path, entry] of Object.entries(seo.pages)) {
  const target = path === '/' ? join(dist, 'index.html') : join(dist, path.slice(1), 'index.html');
  await mkdir(resolve(target, '..'), { recursive: true });
  await writeFile(target, render(path, entry), 'utf8');
}
const missing = {
  title: `Page Not Found | ${seo.siteName}`,
  description: 'This address is not part of the Mister Mapillai website.',
  indexable: false,
};
await writeFile(join(dist, '404.html'), render('/404', missing), 'utf8');

const publicPaths = Object.entries(seo.pages).filter(([, entry]) => entry.indexable).map(([path]) => path);
const sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n'
  + '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
  + publicPaths.map(path => `  <url><loc>${xml(pageUrl(path))}</loc></url>`).join('\n')
  + '\n</urlset>\n';
await writeFile(join(dist, 'sitemap.xml'), sitemap, 'utf8');
await writeFile(join(dist, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`, 'utf8');
console.log(`SEO pages: ${Object.keys(seo.pages).length}; sitemap URLs: ${publicPaths.length}; origin: ${origin}`);
