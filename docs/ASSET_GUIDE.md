# Asset Guide — Mister Mapillai

Where every image, frame sequence, logo, font and animation file lives, how it is named, and how to use it from code.

Every asset is under `src/assets/`, organised by **where the website uses it** (not by file type). Nothing in this tree was resized, re-encoded, renamed or deleted when it was organised: files were only moved, and `docs/asset-inventory.csv` records the old path, new path, format, dimensions, hash and usage of every file (526 original files plus the lossless WebP files made later: the Real Grooms gallery and the accessory orbit, see `docs/ASSET_CONVERSION_REPORT.md`).

---

## 1. Folder tree

```text
src/assets/                                   540 files
│
├── animations/
│   ├── hero-frames/
│   │   ├── webp_v2/              197  frame_0001.webp … frame_0197.webp + manifest.json   Runtime hero sequence (1920×1088 lossless WebP)
│   │   ├── new_v2/               197  frames00001.png … frames00197.png Master PNG frames of the current sequence (read only by the build script)
│   │   ├── new_v1_webp/ new_v1/  202  The previous sequence (V1): no longer loaded by the site
│   │   ├── web/                  201  frame-001.webp … frame-201.webp   Previous sequence (lossy WebP), no longer loaded by the site
│   │   └── source/               201  frames00001.png … frames00201.png Previous sequence masters, no longer used
│   └── lottie/                     1  mm-loader.json                     Site loader emblem animation
│
├── brand/
│   └── logos/                      1  seal.svg                           Brand seal emblem
│
├── fonts/                         20  self-hosted WOFF2 (see §7)
│   ├── serif/                      6  Cormorant Garamond
│   └── sans-serif/                 4  Inter Variable, Josefin Sans
│
└── images/
    ├── collections/
    │   ├── looks/                 23  the 13 signature looks + their -sm thumbnails
    │   └── wide/                   6  wide editorial crops of the looks
    ├── home/
    │   └── before-after/           6  the "before" side of the Before & After slider
    ├── about/
    │   ├── our-story/              6  Our Story collage: 5 embroidery details + the golden shirt
    │   └── how-we-make/            6  How We Make steps 2–4 (3 WebP in use + 3 PNG masters)
    ├── real-grooms/
    │   ├── gallery/                5  original gallery photographs (PNG masters; not loaded by the site)
    │   ├── webp/                   5  lossless WebP versions of the gallery photographs, full size (lightbox)
    │   │   └── sm/                 5  640 px wide lossless renditions (gallery cards, testimonial avatars)
    │   └── happy-groom-story/     18  the Mr. Gowtham case study: shirt, placements, details, materials, boards
    ├── testimonials/               5  groom portraits (groom-profile-1 … 5)
    ├── accessories/
    │   ├── orbit/                  8  "Complete the Look" orbit: 5 cut-outs (256×256 WebP) + 3 PNG originals (no longer loaded)
    │   ├── webp/                   4  lossless WebP versions the orbit loads: groom (full + 561 px) and the belt and trousers (256 px)
    │   └── originals/              7  original PNG masters the orbit cut-outs were made from
    └── shared/
        ├── devatan-shirt/         10  the Devatan embroidered shirt: details, placements, sketch (several sections)
        └── design-boards/          2  design moodboard and motif studies (several sections)
```

There are no videos, standalone icon files or CSS background images in the project, so those folders do not exist. Favicon, manifest, `robots.txt` and the sitemap live in `public/` and are served from the site root (they are not imported by code).

## 2. Which section uses which folder

| Website section | Assets | Registry module |
|---|---|---|
| Home — hero | `animations/hero-frames/webp_v2/` | loaded by `sections/Home/heroFrames.ts` (glob), not the registry |
| Home — Before & After | `images/home/before-after/` (+ looks as the "after" side) | `transformationAssets` |
| Home — Real Grooms gallery, its lightbox, testimonial avatars | `images/real-grooms/webp/` (+ `sm/`) | loaded by `sections/Home/ourWorksGallery.ts` (glob) |
| Collections — signature looks, carousel, grid | `images/collections/looks/` | `collectionAssets` |
| Collections — Complete the Look orbit | `images/accessories/orbit/` (cut-outs) and `images/accessories/webp/` | `accessoryAssets` |
| About — Our Story collage | `images/about/our-story/` | `aboutAssets` |
| About — How We Make | `images/about/how-we-make/` | `ceremonyAssets` |
| Happy Groom story | `images/real-grooms/happy-groom-story/` | `happyGroomsAssets` |
| Journey, styling, brand pillars, Devatan feature | `images/shared/` | `ceremonyAssets`, `collectionAssets` |
| Testimonials portraits | `images/testimonials/` | `testimonialAssets` |
| Loader, brand | `animations/lottie/`, `brand/logos/` | `brandAssets` |
| Typography | `fonts/` | `src/styles/fonts.css` |

### Assets shared by several sections
`collections/looks/` images are reused by the looks data, the home showcase, the ceremonies page and the About studio cards (e.g. `sherwani.webp`, `tuxedo.webp`, `double-breasted.webp`, `bandhgala-ivory.webp`, `ceremonial-shirt.webp`, `silk-veshti-sm.webp`, `indowestern.webp`). `shared/design-boards/moodboard.webp` feeds the brand pillars, the showcase and the journey. `shared/devatan-shirt/` feeds the journey, styling and brand data. `happy-grooms-hero.webp` is also the social-preview image (see §6). Keep these where they are; do not copy them into a section folder.

---

## 3. Naming conventions

- Lowercase kebab-case, no spaces: `bandhgala-black.webp`.
- Responsive suffixes: `name.webp` (full), `name-sm.webp` (thumbnail, 440×660), `name-wide.webp` (wide crop).
- Sequences are zero-padded: `frame_0001.webp`.
- Name by subject, not by camera or tool: `midnight-crystal-bandhgala.webp`, never `IMG_4821`, `image1`, `final`, `copy`, `temp`.
- A file name is part of the image's identity in this project (see §6), so **rename a file only together with every place that refers to it**.

Existing names that do not follow the convention are listed here instead of being changed, because some are load-bearing:

| Current name | Why it was left | Suggested name |
|---|---|---|
| `how-we-make/chair_coat.webp`, `sitch.webp`, `image.webp` | keys `chair_coat`, `sitch`, `image` are used in `AboutSections.tsx` | `how-we-make-step-02-fabric.webp`, `…-03-stitch.webp`, `…-04-fit.webp` |
| `real-grooms/gallery/image.png`, `image1.png`, `image2.png`, `imagee.png`, `imagei.png` | these are the untouched originals. The site loads their lossless WebP copies in `real-grooms/webp/`, named `real-groom-NN-<subject>.webp` (the number keeps the display order) | none needed |
| `accessories/orbit/image.png`, `belt.png`, `pant.png` | the untouched PNG originals; the site loads `accessories/webp/orbit-groom.webp`, `orbit-belt.webp`, `orbit-pant.webp` | none needed |
| `accessories/originals/1.png`, `32.png`, `321.png`, `main_image.png`, … | unreferenced masters | `accessory-brooch-original.png` etc. |
| `shared/devatan-shirt/place-0..2.webp`, `detail-0..4.webp` | keys `place-N`, `detail-N` are used in data files | `devatan-placement-front.webp`, `devatan-detail-01.webp` … |

## 4. Image sequences

**Hero frames.** `animations/hero-frames/webp_v2/frame_0001.webp … frame_0197.webp` are the frames the site plays, in order (1920×1088, lossless WebP; `manifest.json` lists the order and a pixel hash for each). `animations/hero-frames/new_v2/frames00001.png … frames00197.png` are the master PNGs. The previous sequence (`web/`, `source/`) is no longer loaded. The numbering is the order: the loader sorts by the number in the file name. Some neighbouring frames are byte-identical (the footage holds: frames 1–2 and 198–201); the loader fetches each distinct file once.

Rebuild the web frames from the masters (never edits the masters):

```bash
python scripts/build-hero-frames.py
```

Do not delete, rename or reorder frames in `web/` without re-running it.

## 5. Adding assets

### A new collection look
1. Add `my-look.webp` (900×1350) and `my-look-sm.webp` (440×660) to `images/collections/looks/`.
2. Import them in `src/data/assets/collections.ts` and export them from `collectionAssets`.
3. Register `'my-look'` and `'my-look-sm'` in `src/data/images.ts`.
4. Add the dimensions to `src/data/imageMetadata.ts` (see §6, the script covers this folder).
5. Add the look to `src/data/outfits.ts`.

### A new groom photograph (Real Grooms gallery)
1. Put the original in `images/real-grooms/gallery/` (it is the master; the site does not load it).
2. Add `('original.png', 'real-groom-NN-subject.webp')` to `GALLERY_FILES` in `scripts/convert-lossless-webp.py`, using the next two-digit number, and run `python scripts/convert-lossless-webp.py`. It writes a **lossless** full-size WebP into `images/real-grooms/webp/` and a 640 px lossless rendition into `webp/sm/` (cards and avatars), and checks that each is a VP8L (lossless) stream with the right dimensions and exactly the right pixels. It never modifies the original.
3. Both files are picked up automatically (`ourWorksGallery.ts` globs `webp/` and `webp/sm/`, matched by file name, sorted by file name). For a custom title, caption or focal point, add an entry keyed by the WebP file name to `CURATED_WORKS` in `sections/Home/ourWorksGallery.ts`. To show it as a testimonial avatar, set `galleryFile` in `src/data/testimonials.ts` to the same file name.

### A new testimonial portrait
Put it in `images/testimonials/`, import it in `src/data/assets/testimonials.ts` and register it in `src/data/images.ts`.

### A new accessory image
Make a transparent, square cut-out (256×256 is enough: it is shown at 34–114 px; a lossless WebP via `scripts/convert-lossless-webp.py` is best, a lossy 256 px WebP is also fine) and save it in `images/accessories/orbit/` (or `images/accessories/webp/` for a converted one). Import it in `src/data/assets/accessories.ts`, register an `orbit-…` key in `src/data/images.ts`, map it to its accessory in `sections/Collections/StylingOrbit.tsx`, and keep the original in `images/accessories/originals/`.

## 6. Using assets in code

Never import an image from a component. Components use the type-safe registry:

```tsx
import { SourceImage } from '../../components/common/SourceImage';

<SourceImage asset="sherwani" alt="Ivory embroidered sherwani" responsive sizes="(max-width: 900px) 100vw, 50vw" loading="lazy" />
```

The chain is: file in `src/assets/…` → imported in a domain module `src/data/assets/<domain>.ts` → exposed as an `ImageKey` in `src/data/images.ts` → dimensions in `src/data/imageMetadata.ts` → rendered by `<SourceImage>`. **Moving a file only changes the import path in `src/data/assets/<domain>.ts`; keys, components and data do not change.**

Things that depend on file names or folders:
- `scripts/generate-seo.mjs` finds the social-preview image in `dist/assets/` by the name `happy-grooms-hero-<hash>.webp`. Do not rename `happy-grooms-hero.webp`.
- `scripts/image-metadata.ts` builds `imageMetadata.ts` entries from the file names in the folders listed in `KEYED_IMAGE_FOLDERS`. Entries for the About, orbit and similar images are maintained by hand, so check `git diff` before committing a regenerated file.
- `scripts/build-hero-frames.py` reads `animations/hero-frames/new_v2/` and writes lossless WebP and `manifest.json` to `animations/hero-frames/webp_v2/`, checking every frame is pixel-identical to its PNG.
- `scripts/convert-lossless-webp.py` reads the PNG originals in `real-grooms/gallery/` and `accessories/orbit/` and writes lossless WebP into `real-grooms/webp/` (+ `sm/`) and `accessories/webp/`; `--check` only verifies (see §5 and `docs/ASSET_CONVERSION_REPORT.md`).
- `sections/Home/heroFrames.ts` and `sections/Home/ourWorksGallery.ts` load their folders (`animations/hero-frames/webp_v2/`, and `images/real-grooms/webp/` with `webp/sm/`) with `import.meta.glob`.
- `scripts/extract-assets.ts` is the one-off script that created the first asset set from a downloaded HTML preview. It still writes to the old flat paths and is not part of the current workflow.

## 7. Fonts

`fonts/serif/` and `fonts/sans-serif/` are the files `src/styles/fonts.css` loads. The 10 files at the root of `fonts/` are byte-identical copies of those and are not referenced; they were left in place (see §8). See `docs/FONT_GUIDE.md`.

## 8. Duplicates (reported, all kept)

Byte-identical files at different paths. Nothing was merged or removed:

- `about/our-story/detail-0..4.webp` and `devatan-shirt.webp` are identical to `shared/devatan-shirt/detail-0..4.webp` and `devatan-shirt.webp` (the same embroidery photographs used by two different sections).
- `accessories/originals/1.png` = `accessories/orbit/belt.png`; `accessories/originals/main_image.png` = `shoe.png`.
- The 10 loose `fonts/*.woff2` files = the files in `fonts/serif/` and `fonts/sans-serif/`.
- Inside the hero sequence: `frame_0194 = 0195 = 0196 = 0197` (the held end card; also in `new_v2/`). The loader fetches each distinct file once.

## 9. Images with no literal reference in code

Masters, kept for future use: `real-grooms/gallery/*.png` and `accessories/orbit/{image,belt,pant}.png` (the originals of the lossless WebP files the site loads), `about/how-we-make/{chair_coat,image,sitch}.png`, `accessories/originals/{1,32,321,hand_towel,main_image,shoe,watch}.png`, and `shared/devatan-shirt/devatan-shirt.webp` (a legacy copy, imported but not registered).

Registered in `data/images.ts` but not named in any component or data file (check before deleting; they may be used dynamically): `sherwani-wide`, `gowtham`, `happy-grooms-shirt`, `place-0`, `place-2`, `groom-profile-1 … 5`.

## 10. Image standards

1. **Formats**: photographs and cut-outs are WebP (transparent cut-outs keep their alpha channel); logos are SVG; masters stay PNG. Photographs that were already lossy WebP stay as they are (see `docs/ASSET_CONVERSION_REPORT.md`); PNG originals the site shows are converted to **lossless** WebP.
2. **Sizes**: looks 900×1350, `-sm` thumbnails 440×660, hero frames 1920×1088, orbit cut-outs 256×256.
3. **Intrinsic dimensions** of every registered image are recorded in `src/data/imageMetadata.ts` so the browser reserves the right space before the bytes arrive.
4. **Never** replace an original with a compressed or resized version; add a derivative next to it instead.

## 11. Inventory and integrity

`docs/asset-inventory.csv` lists every file with: filename, original path, new path, format, dimensions, size, the first 12 characters of the SHA-256, image keys, website section and the source files that use it.

The reorganisation was verified by hashing every file before and after: 526 files before and after, 506 moved files byte-identical at their new paths, the 20 fonts untouched.

The Real Grooms WebP conversion was verified separately: each `real-grooms/webp/*.webp` is a VP8L (lossless) bitstream with the same dimensions as its PNG original and **zero** pixel difference, the browser decodes both to identical pixels, and the originals' hashes are unchanged.
