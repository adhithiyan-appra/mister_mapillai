# About Us — "How We Make" Step One Asset Report

## 1. Asset Search & Verification Result

- **Searched directories:** Complete `src/assets/` and `public/` trees (all `.png`, `.webp`, `.jpg`, `.jpeg`, `.svg` files), including visual inspection of generically named files (`src/assets/images/about/how-we-make/image.png`, `src/assets/images/collections/looks/image.png`, `src/assets/images/accessories/orbit/image.png`).
- **Original local asset status:** **Missing locally.**
  - `src/assets/images/about/how-we-make/` previously contained only Steps Two, Three, and Four (`chair_coat`, `sitch`, and `image` in `.png` + `.webp`).
- **Previous component reference:** `src/sections/AboutPage/AboutSections.tsx` (`MakingTimeline`, Step One: *Listen & Sketch*) previously loaded the exact gold wedding rings image remotely via an external Unsplash URL:
  `https://images.unsplash.com/photo-1606800052052-a08af7148866?w=900&q=70&auto=format&fit=crop`

## 2. Stored Local Assets

To remove the external CDN dependency while preserving the exact original photograph at higher resolution and zero lossy compression:

- **Original standalone PNG stored at:**
  `src/assets/images/about/how-we-make/step-one-listen-sketch.png`
  - Dimensions: `1600 × 1067` (RGB PNG, 2,189,131 bytes)
  - Source: Exact original Unsplash asset (`photo-1606800052052-a08af7148866`, fetched at `w=1600&fm=png`)
- **Genuine lossless WebP asset stored at:**
  `src/assets/images/about/how-we-make/step-one-listen-sketch.webp`
  - Dimensions: `1600 × 1067` (RGB lossless WebP, `lossless=True, method=6`, 1,649,090 bytes)
  - Follows the exact `.png` + `.webp` pairing convention used by `chair_coat`, `sitch`, and `image` in `src/assets/images/about/how-we-make/`.

Both files were visually verified to confirm the exact two gold wedding rings on woven white fabric with sharp detail, preserved aspect ratio, and zero artifacts.

## 3. Asset Registry & Component References

- **Asset module:** `src/data/assets/ceremonies.ts`
  - Added `stepOneImage` importing `../../assets/images/about/how-we-make/step-one-listen-sketch.webp`.
- **Central image registry:** `src/data/images.ts`
  - Registered `'step-one-listen-sketch': ceremonyAssets.stepOneImage`.
- **Image dimensions metadata:** `src/data/imageMetadata.ts`
  - Added `'step-one-listen-sketch': { width: 1600, height: 1067 }`.
- **Component:** `src/sections/AboutPage/AboutSections.tsx` (`MakingTimeline`, `craftSteps[0]`)
  - Replaced `externalSrc: REFERENCE_STEP_ONE_IMAGE` with local `asset: 'step-one-listen-sketch'` rendered via `<SourceImage />`.
  - Updated `objectPosition` to `'center'` so both rings remain centered cleanly across desktop, tablet, and mobile viewports without clipping.
  - Steps Two (`chair_coat`), Three (`sitch`), and Four (`image`), section copy, timeline animations, and layout remain unchanged.

## 4. Verification

- `npm run build` (`tsc -b && vite build && node scripts/generate-seo.mjs`): passed with 0 errors; `step-one-listen-sketch` bundled cleanly into `dist/assets/`.
- `npm run seo:validate`: passed (6 route heads, 5 sitemap URLs, social image, JSON-LD and robots).
