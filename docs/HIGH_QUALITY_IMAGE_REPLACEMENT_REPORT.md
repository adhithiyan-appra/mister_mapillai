# High-Quality Image Replacement Report

Date: 2026-11-23  
Source: `src/assets/images/collections/new_high_quality`  
Output: `src/assets/images/collections/high_quality_webp`

## Summary

- High-quality source images discovered: **5**
- Verified visual matches: **5 of 5**
- Logical photographs replaced: **5**
- Superseded active assets: **10** (five full images and five small variants)
- Genuine lossless WebP files created: **10**
- Unmatched source images: **0**
- Broken imports or image-loading errors: **0**
- Production build: **Passed** (`npm run build`)

All five sources are 6144 × 7680 PNG files (4:5 aspect ratio, 47.19 megapixels, 24-bit RGB). Visual identity was checked by groom, outfit, embroidery, pose, background, and composition. The source PNG files and the former WebP files remain untouched as backups.

## Replacement Inventory

| High-quality source | Verified existing assets | Active outfit / website usage | Replacement status |
|---|---|---|---|
| `mister_mapillai_navy_groom_8k.png` | `royal-engagement-sangeet.webp`, `royal-engagement-sangeet-sm.webp` | Royal Engagement & Sangeet; collection carousel, Find Your Look grid/filter, detail dialog, Contact look picker | Replaced |
| `mister_mapillai_burgundy_groom_8k.png` | `grand-tamil-reception.webp`, `grand-tamil-reception-sm.webp` | Grand Tamil Reception; collection carousel, Find Your Look grid/filter, detail dialog, Contact look picker | Replaced |
| `mister_mapillai_muhurtham_8k.png` | `traditional-muhurtham-collection.webp`, `traditional-muhurtham-collection-sm.webp` | Traditional Muhurtham Collection; collection carousel, Find Your Look grid/filter, detail dialog, Contact look picker | Replaced |
| `mister_mapillai_muhurtham_exact_8k.png` | `traditional-mapillai-azhaippu.webp`, `traditional-mapillai-azhaippu-sm.webp` | Traditional Mapillai Azhaippu; collection carousel, Find Your Look grid/filter, detail dialog | Replaced |
| `mister_mapillai_ivory_muhurtham_8k.png` | `elegant-nalangu-collection.webp`, `elegant-nalangu-collection-sm.webp` | Elegant Nalangu Collection; collection carousel, Find Your Look grid/filter, detail dialog, Contact look picker | Replaced |

The shared registry in `src/data/assets/collections.ts` is the single replacement point. Existing keys in `src/data/images.ts` and outfit records in `src/data/outfits.ts` remain stable, so every consumer receives the replacement without duplicate mappings.

## Conversion Verification

Each full output was created with Sharp using `webp({ lossless: true })`, keeps the source's 6144 × 7680 dimensions, preserves the 4:5 aspect ratio and orientation, and reports WebP/sRGB/three channels. Each responsive derivative is a separate 1120 × 1400 lossless WebP. Binary inspection found the WebP lossless `VP8L` chunk in all ten outputs.

| Source PNG | Source bytes | Full lossless WebP | Full bytes | Responsive lossless WebP | Responsive bytes |
|---|---:|---|---:|---|---:|
| `mister_mapillai_navy_groom_8k.png` | 23,436,741 | `mister_mapillai_navy_groom_8k.webp` | 15,281,478 | `mister_mapillai_navy_groom_8k-sm.webp` | 1,357,714 |
| `mister_mapillai_burgundy_groom_8k.png` | 28,751,105 | `mister_mapillai_burgundy_groom_8k.webp` | 15,647,858 | `mister_mapillai_burgundy_groom_8k-sm.webp` | 1,341,770 |
| `mister_mapillai_muhurtham_8k.png` | 34,207,427 | `mister_mapillai_muhurtham_8k.webp` | 21,060,126 | `mister_mapillai_muhurtham_8k-sm.webp` | 1,870,998 |
| `mister_mapillai_muhurtham_exact_8k.png` | 36,907,300 | `mister_mapillai_muhurtham_exact_8k.webp` | 17,903,060 | `mister_mapillai_muhurtham_exact_8k-sm.webp` | 1,760,980 |
| `mister_mapillai_ivory_muhurtham_8k.png` | 38,964,591 | `mister_mapillai_ivory_muhurtham_8k.webp` | 24,374,572 | `mister_mapillai_ivory_muhurtham_8k-sm.webp` | 2,052,674 |

### Superseded Backup Sizes

| Former active full / small assets | Full bytes | Small bytes |
|---|---:|---:|
| `royal-engagement-sangeet.webp` / `royal-engagement-sangeet-sm.webp` | 1,197,172 | 355,038 |
| `grand-tamil-reception.webp` / `grand-tamil-reception-sm.webp` | 1,557,198 | 456,638 |
| `traditional-muhurtham-collection.webp` / `traditional-muhurtham-collection-sm.webp` | 1,731,572 | 525,896 |
| `traditional-mapillai-azhaippu.webp` / `traditional-mapillai-azhaippu-sm.webp` | 1,762,766 | 527,540 |
| `elegant-nalangu-collection.webp` / `elegant-nalangu-collection-sm.webp` | 290,628 | 55,350 |

These files remain under `src/assets/images/collections/looks` as recoverable backups, but no active source import references them.

## Code and Loading Changes

- `src/data/assets/collections.ts`: redirected the five full/small asset pairs to `high_quality_webp`.
- `src/data/imageMetadata.ts`: updated intrinsic full dimensions to 6144 × 7680 and responsive dimensions to 1120 × 1400.
- `src/sections/Collections/LookDialog.tsx`: enabled the existing `srcSet` path so the dialog selects an appropriate responsive candidate instead of downloading an 8K file at a roughly 440px display width.
- Existing card sizes, object-fit/object-position rules, ordering, hover behavior, animations, filters, carousel behavior, detail navigation, and booking selection behavior were preserved.

The Find Your Look cards already use native lazy loading; the carousel prioritizes the front and nearby images; the Contact picker uses a 160px responsive size. Playwright confirmed that cards, dialog, and picker selected the new `-sm.webp` candidates at tested viewport sizes.

## Site-Wide Audit Result

The audit covered React/TypeScript imports, shared image registries, outfit data, Home transformations, About/How We Make, Real Grooms, Testimonials, accessories, hero-frame glob loading, CSS image rules, `public`, and the Contact booking picker.

No source image was a confident visual match for the Home hero sequence, Before & After pairs, About/Our Story, How We Make, Real Grooms, Testimonials, or accessory assets. Those images were intentionally left unchanged rather than assigning an unrelated photograph. A complete source search found no remaining active import of the five superseded `collections/looks` paths.

## Validation

### Static and Binary

- All ten outputs decode through Sharp as WebP.
- All five full outputs are 6144 × 7680.
- All five responsive outputs are 1120 × 1400.
- All ten outputs contain the lossless `VP8L` payload.
- Source PNGs were not modified.
- Former WebP files were not overwritten or deleted.
- TypeScript and Vite production build passed.

### Rendered QA

Browser plugin availability: not available; Playwright Core used with installed Google Chrome.

Tested `/collections` at:

- Desktop: 1440 × 1000
- Tablet: 820 × 1180
- Mobile: 390 × 844

Results:

- Correct page URL/title and meaningful content rendered.
- No blank page or framework error overlay.
- No console warnings, console errors, or uncaught page errors.
- No horizontal overflow at any tested width.
- All five mapped collection images loaded from `high_quality_webp`.
- No duplicate high-quality image response was observed.
- Filters passed: All 18, Muhurtham 4, Reception 5, Engagement / Sangeet 5, Groom's Family 6.
- Carousel next control changed the active look.
- Details dialog opened and used the responsive high-quality image.
- Contact form progressed to the style step; four mapped looks in its first-six picker loaded their new responsive assets.
- Home Before & After control reached `aria-valuenow="100"` with the correct final state.

## Remaining Risk

- Safari and Firefox were not available in this environment; Chrome was used for rendered QA.
- Full 8K lossless files are intentionally large. Normal collection surfaces select the 1120 × 1400 lossless candidates through `srcSet`; the 8K masters remain available for high-resolution use without being the normal card download.
