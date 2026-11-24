import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Home page only: starts fetching what the hero needs while the HTML is still parsing, instead of waiting for the JS bundle
 * to download and React to render.
 *  - Frame 1 (the poster): same URL as the poster <img>, so the browser reuses this one request. Low priority, so it never takes
 *    bandwidth from the script and styles that gate the whole page; it is fetched beside them, not ahead of them.
 *  - The hero's headline fonts: they are first requested when the hero renders, and swapping them in after the introduction has
 *    appeared reflows the text (layout shift).
 * Frame 2 is deliberately not preloaded: the frame loader requests it with fetch(), which a preloaded image does not serve
 * while it is still in flight, and the second copy competes with the script on a slow connection.
 */
function heroPreload(): Plugin {
  const fonts = ['cormorant-garamond-500', 'cormorant-garamond-500-italic', 'cormorant-garamond-600-700'];
  return {
    name: 'hero-preload',
    transformIndexHtml(_html, ctx) {
      const find = (pattern: RegExp, fallback: string) => {
        const asset = ctx.bundle ? Object.keys(ctx.bundle).find(name => pattern.test(name)) : undefined;
        return asset ? `/${asset}` : fallback;
      };
      const poster = find(/(^|\/)frame-0001-[^/]+\.webp$/, '/src/assets/animations/hero-frames/new_v1_webp/frame-0001.webp');
      // Fonts are only bundled (and hashed) in a build; the dev server has nothing to preload.
      const fontUrls = ctx.bundle ? fonts.map(font => find(new RegExp(`(^|/)${font}-[\\w-]{8}\\.woff2$`), '')).filter(Boolean) : [];
      const script = `(function(){if(location.pathname.split('/').join('')!==''){return}var add=function(u,as,p,x){var l=document.createElement('link');l.rel='preload';l.as=as;l.href=u;if(p)l.setAttribute('fetchpriority',p);if(x){l.type='font/woff2';l.crossOrigin='anonymous'}document.head.appendChild(l)};add(${JSON.stringify(poster)},'image','low');${JSON.stringify(fontUrls)}.forEach(function(u){add(u,'font','',1)})})()`;
      return [{ tag: 'script', children: script, injectTo: 'head-prepend' }];
    },
  };
}

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  plugins: [react(), tailwindcss(), heroPreload()],
  build: { assetsInlineLimit: 0 },
});
