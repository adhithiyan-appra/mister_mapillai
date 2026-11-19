import socialImage from '../assets/images/real-grooms/happy-groom-story/happy-grooms-hero.webp';
import seo from '../data/seo.json';
import type { RoutePath } from '../router';

function meta(selector: string, attribute: 'name' | 'property', key: string, content: string) {
  let node = document.head.querySelector<HTMLMetaElement>(selector);
  if (!node) {
    node = document.createElement('meta');
    node.setAttribute(attribute, key);
    document.head.appendChild(node);
  }
  node.content = content;
}

function pageSchema(path: RoutePath, origin: string) {
  const entry = seo.pages[path];
  const url = new URL(path, `${origin}/`).href;
  const graph: Record<string, unknown>[] = [];
  if (path === '/') {
    graph.push(
      { '@type': 'Organization', '@id': `${origin}/#organization`, name: seo.siteName, url: `${origin}/`, logo: `${origin}/seal.svg` },
      { '@type': 'WebSite', '@id': `${origin}/#website`, name: seo.siteName, url: `${origin}/`, publisher: { '@id': `${origin}/#organization` } },
    );
  }
  if (entry.indexable) {
    graph.push({
      '@type': 'WebPage', '@id': `${url}#webpage`, url, name: entry.title,
      description: entry.description, isPartOf: { '@id': `${origin}/#website` },
    });
    if (path !== '/') graph.push({
      '@type': 'BreadcrumbList', '@id': `${url}#breadcrumb`,
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
        { '@type': 'ListItem', position: 2, name: entry.breadcrumb, item: url },
      ],
    });
  }
  return graph.length ? { '@context': 'https://schema.org', '@graph': graph } : null;
}

/** Keep the head accurate after History API navigation; direct loads get the same tags from the build. */
export function applyPageSeo(path: RoutePath | null) {
  const entry = path ? seo.pages[path] : {
    title: `Page Not Found | ${seo.siteName}`,
    description: 'This address is not part of the Mister Mapillai website.',
    indexable: false,
  };
  const initialCanonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  const origin = initialCanonical ? new URL(initialCanonical.href).origin : window.location.origin;
  const url = new URL(path ?? window.location.pathname, `${origin}/`).href;
  const image = new URL(socialImage, `${origin}/`).href;

  document.title = entry.title;
  meta('meta[name="description"]', 'name', 'description', entry.description);
  meta('meta[property="og:type"]', 'property', 'og:type', 'website');
  meta('meta[property="og:site_name"]', 'property', 'og:site_name', seo.siteName);
  meta('meta[property="og:title"]', 'property', 'og:title', entry.title);
  meta('meta[property="og:description"]', 'property', 'og:description', entry.description);
  meta('meta[property="og:url"]', 'property', 'og:url', url);
  meta('meta[property="og:image"]', 'property', 'og:image', image);
  meta('meta[property="og:image:alt"]', 'property', 'og:image:alt', 'Mister Mapillai bespoke groom wear');
  meta('meta[name="twitter:card"]', 'name', 'twitter:card', 'summary_large_image');
  meta('meta[name="twitter:title"]', 'name', 'twitter:title', entry.title);
  meta('meta[name="twitter:description"]', 'name', 'twitter:description', entry.description);
  meta('meta[name="twitter:image"]', 'name', 'twitter:image', image);

  let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (path) {
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = url;
  } else canonical?.remove();

  const robots = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]');
  if (entry.indexable) robots?.remove();
  else meta('meta[name="robots"]', 'name', 'robots', 'noindex,follow');

  const schema = path ? pageSchema(path, origin) : null;
  let script = document.head.querySelector<HTMLScriptElement>('#seo-structured-data');
  if (schema) {
    if (!script) {
      script = document.createElement('script');
      script.id = 'seo-structured-data';
      script.type = 'application/ld+json';
      document.head.appendChild(script);
    }
    script.textContent = JSON.stringify(schema).replace(/</g, '\\u003c');
  } else script?.remove();
}
