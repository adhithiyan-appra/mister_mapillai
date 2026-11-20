import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';
import type { Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Starts fetching hero frame 1 (the poster) while the HTML is still parsing, on the
 * home page only. Without it the request waits for the JS bundle to download and
 * React to render, ~2 s later on a slow connection. fetchpriority=high matches the
 * poster <img>, and the URL is the same, so the browser reuses this one request.
 */
function heroPosterPreload(): Plugin {
  return {
    name: 'hero-poster-preload',
    transformIndexHtml(_html, ctx) {
      const asset = ctx.bundle
        ? Object.keys(ctx.bundle).find(name => /(^|\/)frame-001-[^/]+\.webp$/.test(name))
        : undefined;
      const href = asset ? `/${asset}` : '/src/assets/animations/hero-frames/web/frame-001.webp';
      const script = `(function(){if(location.pathname.split('/').join('')!==''){return}var l=document.createElement('link');l.rel='preload';l.as='image';l.href=${JSON.stringify(href)};l.setAttribute('fetchpriority','high');document.head.appendChild(l)})()`;
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
  plugins: [react(), tailwindcss(), heroPosterPreload()],
  build: { assetsInlineLimit: 0 },
});
