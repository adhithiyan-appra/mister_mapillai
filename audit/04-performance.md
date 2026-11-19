# Phase 4 — Performance

Coverage: static build output and browser-level checks only. No Lighthouse run, no network throttling, and no real-device lab profile was used.

## Findings

### [PERF-001] Several multi-megabyte raster assets are shipped in the production bundle
- **Severity:** High
- **Confidence:** VERIFIED
- **Where:** Build output `dist/assets/*.png`; source references in `src/data/assets/accessories.ts:10-12`, `src/sections/AboutPage/AboutSections.tsx:44,53`, `src/data/testimonials.ts:15,22,29`, `src/sections/Home/ourWorksGallery.ts:44-73`
- **Evidence:** `npm run build` emitted `chair_coat-P-N2st5Z.webp` at 1,456.16 kB, `sitch-CT7BNWcm.webp` at 1,708.07 kB, `pant-D_TxqwwA.png` at 1,750.13 kB, `image2-Bp4Fp2nC.png` at 2,206.61 kB, `image-DBAmbfKo.png` at 2,223.17 kB, `image-BaEWOyXi.png` at 2,228.02 kB, `imagee-rIxMLEyp.png` at 2,234.28 kB, `imagei-WAC-VllO.png` at 2,353.66 kB, `image1-DkZ7SSAa.png` at 2,556.02 kB and `belt-Gy1wd7zF.png` at 2,669.93 kB.
- **Impact:** A mobile visitor can download several megabytes of imagery for the gallery/about/accessory sections. This is the largest realistic performance cliff found and is likely to dominate LCP and data cost on slower connections.
- **Fix:** Convert the remaining PNGs to WebP/AVIF, generate responsive `srcset` variants, lazy-load below-the-fold images, and keep explicit dimensions from `src/data/imageMetadata.ts`. Re-run `npm run build` and compare emitted asset sizes.
- **Effort:** M

### [PERF-002] Main JavaScript chunk exceeds Vite's 500 kB warning threshold
- **Severity:** Medium
- **Confidence:** VERIFIED
- **Where:** Build output `dist/assets/index-sHwbA7Rm.js`; `vite.config.ts:31-39`
- **Evidence:** `npm run build` reported `assets/index-sHwbA7Rm.js 525.79 kB │ gzip: 170.82 kB` and warned `Some chunks are larger than 500 kB after minification`.
- **Impact:** The initial bundle is larger than necessary for a mostly static marketing site. Parse/execution cost is meaningful on low-end phones even when gzip transfer is acceptable.
- **Fix:** Split route-level code and heavy animation/Lottie dependencies with dynamic imports or `manualChunks`, then re-measure the entry chunk. Keep the hero poster preload at `vite.config.ts:17-28` intact.
- **Effort:** M

### [PERF-003] Hero poster preload is present and scoped to the home route
- **Severity:** Info
- **Confidence:** VERIFIED
- **Where:** `vite.config.ts:17-28`
- **Evidence:** `heroPosterPreload()` injects a high-priority preload for `frame-001-*.webp` only when `location.pathname.split('/').join('') === ''`.
- **Impact:** The initial hero frame is discoverable during HTML parsing instead of waiting for React render.
- **Fix:** None required.
- **Effort:** S

## Verification

- `npm run build` passed: `✓ 418 modules transformed`, `✓ built in 3.19s`, `SEO pages: 6; sitemap URLs: 5`.
- `node scripts/verify-site.mjs` passed with `Network 4xx/5xx count: 0` and `Console errors count: 0`.
- `node audit/scratch/responsive-audit.mjs` passed with `networkErrors: 0` after switching the scratch Chrome harness to a fresh profile and disabled cache.
