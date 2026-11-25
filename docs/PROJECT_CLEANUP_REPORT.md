# MISTER MAPILLAI — Project Cleanup Report

**Date:** 2026-11-25  
**Git Backup Checkpoint:** `backup-pre-cleanup-2026-11-25` (created at `HEAD` prior to deletion)

---

## 1. Executive Summary

| Metric | Value |
|---|---|
| Total project files inspected (excl. `.git`, `node_modules`, `dist`) | **998** |
| Total files removed | **317** |
| Total disk space reclaimed | **224.81 MB** |
| Remaining project files (excl. `.git`, `node_modules`, `dist`, plus this report) | **682** |
| Active Vite bundle modules before / after cleanup | **446 / 446** (100% identical) |
| TypeScript (`tsc -b`), Production Build (`vite build`), SEO Generation & Validation | **PASS (0 errors)** |

All deletions were verified via static/dynamic import reachability analysis (including multiline `import.meta.glob`, CSS `url()`, HTML entry paths, `vite.config.ts`, and `scripts/*`) plus SHA-256 hash comparison for exact duplicate verification.

---

## 2. Files Removed by Category

### 2.1 Unused Reference, Audit & Temporary Files (66 files, ~23.64 MB)

| Original Path | Count | Reason Safe to Remove |
|---|---|---|
| `r2.txt` | 1 | Stale Node.js error dump referencing deleted `test-compare.mjs`; zero project references. |
| `screenshot-desktop-form.png` | 1 | Temporary root-level QA screenshot from earlier `verify-site.mjs` run; unreferenced by app/build. |
| `screenshot-desktop-hero.png` | 1 | Temporary root-level QA screenshot from earlier `verify-site.mjs` run; unreferenced by app/build. |
| `screenshot-mobile-hero.png` | 1 | Temporary root-level QA screenshot from earlier `verify-site.mjs` run; unreferenced by app/build. |
| `docs/screenshots/screenshot-desktop-form.png` | 1 | Obsolete duplicate QA screenshot; not linked from `README.md` or any `docs/*.md`. |
| `docs/screenshots/screenshot-desktop-hero.png` | 1 | Obsolete duplicate QA screenshot; not linked from `README.md` or any `docs/*.md`. |
| `docs/screenshots/screenshot-mobile-hero.png` | 1 | Obsolete duplicate QA screenshot; not linked from `README.md` or any `docs/*.md`. |
| `audit/**` (`00-recon.md`, `01-investigation.md`, `04-performance.md`, `05-ui-ux.md`, `06-testing.md`, `07-code-quality.md`, `09-changes.md`, `REPORT.md`, `responsive-baseline.json`, `scratch/responsive-audit.mjs`, and 47 `screenshots/baseline-*.png`) | 57 | Completed Nov 19 responsive audit scratch notes, JSON dump, and 47 baseline screenshots; zero references outside `audit/`. |
| `reference/original.html` | 1 | Legacy 7.03 MB base64-embedded single-file prototype HTML from initial extraction; unused by app/build/deploy. |
| `reference/asset-manifest.json` | 1 | Legacy extraction manifest belonging exclusively to `reference/original.html`; unused by app/build/deploy. |

### 2.2 Superseded Hero Frame Sequence (203 files, ~171.67 MB)

| Original Path | Count | Reason Safe to Remove |
|---|---|---|
| `src/assets/animations/hero-frames/new_v1_webp/manifest.json` + 202 `frame-*.webp` files | 203 | Superseded V1 hero sequence (`source: "new_v1"`). Active hero (`HeroSection.tsx` / `heroFrames.ts` / `vite.config.ts`) uses `webp_v3/` exclusively (203 frames built from `v3/`). Both `webp_v3/` and V3 master PNGs `v3/` were preserved intact. |

### 2.3 Duplicate Assets Removed (23 files, ~15.32 MB)

#### Byte-for-Byte Duplicate Font Files (10 files, 230 KB)
Every file below was verified via SHA-256 to be **byte-for-byte identical** to the active `.woff2` copy loaded by `src/styles/fonts.css`:
- `src/assets/fonts/cormorant-garamond-300.woff2` → retained in `src/assets/fonts/serif/cormorant-garamond-300.woff2`
- `src/assets/fonts/cormorant-garamond-400.woff2` → retained in `src/assets/fonts/serif/cormorant-garamond-400.woff2`
- `src/assets/fonts/cormorant-garamond-400-italic.woff2` → retained in `src/assets/fonts/serif/cormorant-garamond-400-italic.woff2`
- `src/assets/fonts/cormorant-garamond-500.woff2` → retained in `src/assets/fonts/serif/cormorant-garamond-500.woff2`
- `src/assets/fonts/cormorant-garamond-500-italic.woff2` → retained in `src/assets/fonts/serif/cormorant-garamond-500-italic.woff2`
- `src/assets/fonts/cormorant-garamond-600-700.woff2` → retained in `src/assets/fonts/serif/cormorant-garamond-600-700.woff2`
- `src/assets/fonts/inter-variable-latin.woff2` → retained in `src/assets/fonts/sans-serif/inter-variable-latin.woff2`
- `src/assets/fonts/josefin-sans-300.woff2` → retained in `src/assets/fonts/sans-serif/josefin-sans-300.woff2`
- `src/assets/fonts/josefin-sans-400.woff2` → retained in `src/assets/fonts/sans-serif/josefin-sans-400.woff2`
- `src/assets/fonts/josefin-sans-600.woff2` → retained in `src/assets/fonts/sans-serif/josefin-sans-600.woff2`

#### Superseded Collection & Redundant Before/After WebP Copies (13 files, ~11.40 MB)
All five Tamil Nadu groom looks and their Home Before/After pairs are actively served from `src/assets/images/collections/high_quality_webp/mister_mapillai_*_8k.webp` (and `-sm.webp` renditions). These earlier low-resolution WebPs had zero references in `src/` or `scripts/`:
- `src/assets/images/collections/looks/elegant-nalangu-collection.webp` & `-sm.webp`
- `src/assets/images/collections/looks/grand-tamil-reception.webp` & `-sm.webp`
- `src/assets/images/collections/looks/royal-engagement-sangeet.webp` & `-sm.webp`
- `src/assets/images/collections/looks/traditional-mapillai-azhaippu.webp` & `-sm.webp`
- `src/assets/images/collections/looks/traditional-muhurtham-collection.webp` & `-sm.webp`
- `src/assets/images/collections/looks/before-after/muhurtham-after.webp` (SHA-256 duplicate of superseded `traditional-mapillai-azhaippu.webp`; active asset is `high_quality_webp/mister_mapillai_muhurtham_exact_8k.webp`)
- `src/assets/images/collections/looks/before-after/nichayathartham-after.webp` (SHA-256 duplicate of superseded `royal-engagement-sangeet-sm.webp`; active asset is `high_quality_webp/mister_mapillai_navy_groom_8k.webp`)
- `src/assets/images/collections/looks/before-after/reception-after.webp` (SHA-256 duplicate of superseded `grand-tamil-reception.webp`; active asset is `high_quality_webp/mister_mapillai_burgundy_groom_8k.webp`)

### 2.4 Unused PNG Files Removed (10 files, ~18.15 MB)

Every removed PNG was individually verified to have zero code/script references and a verified active/higher-resolution replacement retained in the project:

| Original Path | Size | Reason Safe to Remove |
|---|---|---|
| `src/assets/images/collections/looks/image.png` | 2.93 MB | Superseded lower-res draft of *Elegant Nalangu Collection*; replaced by 8K master in `collections/new_high_quality/mister_mapillai_ivory_muhurtham_8k.png` and lossless WebP in `collections/high_quality_webp/`. |
| `src/assets/images/collections/looks/muhurtham1.png` | 2.92 MB | Superseded lower-res draft of *Traditional Mapillai Azhaippu*; replaced by 8K master in `collections/new_high_quality/mister_mapillai_muhurtham_exact_8k.png` and lossless WebP in `collections/high_quality_webp/`. |
| `src/assets/images/collections/looks/muhurtham2.png` | 2.93 MB | Superseded lower-res draft of *Traditional Muhurtham Collection*; replaced by 8K master in `collections/new_high_quality/mister_mapillai_muhurtham_8k.png` and lossless WebP in `collections/high_quality_webp/`. |
| `src/assets/images/accessories/originals/1.png` | 2.67 MB | Exact SHA-256 duplicate of retained `accessories/orbit/belt.png`; zero script or code references. |
| `src/assets/images/accessories/originals/32.png` | 1.01 MB | Unreferenced raw accessory cutout; active WebPs live in `accessories/orbit/` and `accessories/webp/`. |
| `src/assets/images/accessories/originals/321.png` | 1.37 MB | Unreferenced raw accessory cutout; active WebPs live in `accessories/orbit/` and `accessories/webp/`. |
| `src/assets/images/accessories/originals/hand_towel.png` | 1.18 MB | Unreferenced raw accessory cutout; active pocket-square WebP lives in `accessories/orbit/pocket-square.webp`. |
| `src/assets/images/accessories/originals/main_image.png` | 1.29 MB | Exact SHA-256 duplicate of `accessories/originals/shoe.png`; active footwear WebP lives in `accessories/orbit/footwear.webp`. |
| `src/assets/images/accessories/originals/shoe.png` | 1.29 MB | Unreferenced raw accessory cutout; active footwear WebP lives in `accessories/orbit/footwear.webp`. |
| `src/assets/images/accessories/originals/watch.png` | 1.02 MB | Unreferenced raw accessory cutout; active watch WebP lives in `accessories/orbit/watch.webp`. |

### 2.5 Unused Source Files Removed (15 files, ~6.0 KB)

All 15 files had zero imports from any active module, entry point, or script:

- `src/animations/easings.ts`, `src/animations/scroll.ts`, `src/animations/index.ts` — Unused GSAP wrapper layer; live animations run through `AnimationProvider.tsx` and section components.
- `src/config/site.ts`, `src/config/index.ts` — Unused config containing outdated placeholder contact info (`+91 99400 26888`, `vanakkam@mistermapillai.com`); live contact & SEO config live in `src/data/contact.ts` and `src/data/seo.json`.
- `src/constants/index.ts` — Unused constants containing outdated `HERO_FRAME_COUNT: 192` (actual sequence is 203 frames).
- `src/styles/index.css` — Unused stylesheet cascade file (`src/main.tsx` imports the 7 active stylesheets directly in explicit order).
- `src/components/index.ts`, `src/components/animations/index.ts`, `src/components/common/index.ts`, `src/components/layout/index.ts`, `src/components/ui/index.ts`, `src/hooks/index.ts`, `src/sections/index.ts`, `src/utils/index.ts` — Unreferenced barrel re-export files.

---

## 3. Files Intentionally Preserved

- **Active Hero Sequence & V3 Masters:** `src/assets/animations/hero-frames/webp_v3/` (204 files) and `src/assets/animations/hero-frames/v3/` (203 master PNGs used by `scripts/build-hero-frames.py`).
- **8K Collection Masters & Active WebPs:** `src/assets/images/collections/new_high_quality/*.png` (5 master 8K PNGs) and `src/assets/images/collections/high_quality_webp/*.webp` (10 active WebP assets).
- **Before/After Cocktail Masters & All Six Ceremony Pairs:** `collections/looks/before-after/image.png`, `cocktail-before.png`, `cocktail-before.webp`, `cocktail-after.webp`, `muhurtham-before.webp`, `nichayathartham-before.webp`, `reception-before.webp`, and `home/before-after/*.webp`.
- **About Us — How We Make Masters & Active WebPs:** All 4 `.png` + `.webp` pairs (`step-one-listen-sketch`, `chair_coat`, `sitch`, `image`).
- **Real Grooms Gallery & Orbit Script Sources:** `src/assets/images/real-grooms/webp/**` (dynamically loaded via multiline `import.meta.glob` in `ourWorksGallery.ts`), `real-grooms/gallery/*.png` and `accessories/orbit/*.png` (referenced as sources by `scripts/convert-lossless-webp.py`).
- **All Active Application Code, Fonts, Lottie, Logos, Public Assets, Scripts & Config:** `package.json`, `package-lock.json`, `vite.config.ts`, `tsconfig.json`, `vercel.json`, `.env.example`, `.gitignore`, `index.html`, `public/*`, `scripts/*`, `README.md`, `IMPLEMENTATION_CHECKLIST.md`, `docs/*.md`, `docs/asset-inventory.csv`.

### Uncertain / Retained for Safety
- **`src/data/images.ts` & `src/data/assets/*.ts` registry keys** (including shared/wide/legacy keys such as `sherwani-wide`, `double-breasted`, `charcoal-suit`, `happy-grooms-*`, and the shared copies between `about/our-story/` and `shared/devatan-shirt/`): retained untouched because both folders are imported by `about.ts` and `ceremonies.ts` and several keys are referenced by legacy aliases, gallery/story modules, or dynamic key lookups.
- **`scripts/extract-assets.ts` & `scripts/verify-site.mjs`**: retained untouched (note `package.json` still defines `"extract-assets": "node scripts/extract-assets.ts"`).
- **`IMPLEMENTATION_CHECKLIST.md`**: retained as historical migration documentation.

---

## 4. Build & Validation Results

- **TypeScript (`tsc -b`):** Passed with 0 errors.
- **Production Build (`vite build`):** Passed in 5.60s; `446` modules transformed (identical to pre-cleanup), 0 unresolved imports, 0 missing asset paths.
- **SEO Generation (`scripts/generate-seo.mjs`):** Passed (`SEO pages: 6; sitemap URLs: 5; origin: https://mistermapillai.com`).
- **SEO Validation (`npm run seo:validate`):** Passed (`6 route heads, 5 sitemap URLs, social image, JSON-LD and robots`).
- **Lint:** No ESLint script is configured in `package.json`.

---

## 5. Remaining Optional Cleanup Opportunities (Deferred for Safety)

1. **Deduplicate `about/our-story/*.webp` vs `shared/devatan-shirt/*.webp` (6 identical files, ~100 KB):** Both folders are currently imported by `src/data/assets/about.ts` and `src/data/assets/ceremonies.ts`; unifying imports to one folder would save ~100 KB after verifying all references.
2. **Audit unused `src/data/images.ts` entries:** Legacy wide/story keys (`charcoal-suit`, `double-breasted`, `*-wide`, etc.) could be pruned in a dedicated refactor if confirmed unused across `/ceremonies` and external share links.
3. **Move large offline master PNGs out of Git LFS / repo if desired:** `hero-frames/v3/` (302 MB) and `collections/new_high_quality/` (155 MB) are intentionally preserved in-repo as master editing sources and are not bundled into `dist/`.
