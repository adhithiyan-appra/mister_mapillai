# Mister Mapillai

A complete React + strict TypeScript recreation of the original 3D website. The supplied design is preserved: original content, stylesheet, embedded fonts, images, SVG seal, scroll calculations and responsive breakpoints.

## Run locally

Use Node.js 24 and npm.

```sh
npm ci
npm run dev
```

Open the local URL printed by Vite, normally `http://127.0.0.1:5173`.

```sh
npm run build
npm run preview
```

`build` runs the strict TypeScript check and creates the production frontend in `dist/`. It can be served by any static host. There is no backend, account system, database or external API dependency.

## Consultation delivery

Copy `.env.example` to `.env.local` and optionally configure:

```dotenv
VITE_WHATSAPP_NUMBER=919876543210
```

Use the studio's real number, with country code and digits only. Restart Vite after changing the value; rebuild for production changes. This frontend setting is public in the browser and is not a secret.

- Configured: opens a WhatsApp message containing the name, phone, date, city, selected functions and notes. The visitor must press Send in WhatsApp.
- Empty: copies the same message to the clipboard and directs the visitor to paste it into Instagram messages.
- Clipboard unavailable or denied: shows the original Instagram fallback message.

Nothing is submitted to a server. No status claims a message was sent.

Optional studio details fill the footer, About page, booking page and contact cards; anything left empty is simply not shown:

```dotenv
VITE_CONTACT_PHONE=+91 98765 43210
VITE_CONTACT_EMAIL=hello@example.com
VITE_CONTACT_ADDRESS=Studio street, City, PIN
VITE_CONTACT_HOURS=Mon – Sun · 10 AM – 9 PM
```

## Hero frame sequence

The home hero is a scroll-controlled frame sequence: the section pins full screen and the scroll position selects the frame (scrolling up plays it back).

- Source: the original PNG frames in `src/assets/hero_frames` (201 frames, 1920×1088). They are never modified or shipped (~348 MB).
- Web frames: `python scripts/build-hero-frames.py` (Python 3 + Pillow) writes WebP copies at the full source resolution, in the same numeric order, to `src/assets/hero_frames_web` (quality 90, ~31.5 MB). It reports PSNR against the originals for every frame (minimum 41.7 dB, mean 43.8 dB). Re-run it after changing the frames.
- Rendering (`src/sections/Home/frameRenderer.ts`): frames are decoded ahead of time with `createImageBitmap`, off the main thread and at exactly the drawn size, so each draw is a 1:1 copy. Where `OffscreenCanvas` is supported, the canvas is transferred to a worker (`frameRenderer.worker.ts`) that fetches, decodes, uploads and draws; the page's main thread only posts the frame number. Other browsers run the same renderer on the page.
- Loading: frame 1 is the poster `<img>` (also the static fallback) and is handed to the renderer, never fetched twice. Then frames around the scroll position, then the rest coarse-to-fine (every 32nd frame … every frame), 4 downloads and 3 decodes at a time. Identical frames share one request.
- Memory: every encoded frame is kept (~31 MB); only a window of decoded frames is (12 ahead, 4 behind, plus every 24th frame, about 26 on desktop); frames leaving it are released with `ImageBitmap.close()`. If a frame is not decoded yet, the nearest decoded one is shown, so the canvas is never blank.
- Scroll: one scene on the shared animation scheduler (no GSAP, no extra scroll listener or rAF loop); the frame number changes only when the scroll position does.
- Reduced motion: no pinning and no sequence download; the first frame is a static hero.

## Pages

The site uses the design of `mister-mapillai (2).html` (maroon, gold and cream; Cormorant Garamond and Inter), with all content taken from `src/data/`. See `docs/template-integration.md` for the section-by-section data mapping and the data still missing.

| Route | Contents |
|---|---|
| `/` | Hero, stats counted from the data, ceremony flip cards, before/after slider, journey, lookbook with lightbox, testimonials |
| `/collections` | 3D carousel, filterable looks (`?occasion=`), look details dialog (`?look=`), head-to-toe orbit, craft |
| `/about` | Brand story, Design/Craft/Style, making timeline, studio and contact |
| `/contact` | Four-step booking (`?look=` preselects a look) |
| `/track-order` | Prepares a status request for the stylist; there is no order backend |
| `/ceremonies` | The 3D ceremony corridor and head-to-toe scenes |

`/book` and `/order` redirect to `/contact`; `/track` redirects to `/track-order`.

## Source layout

```text
src/
  assets/
    images/          46 exact extracted WebP assets
    fonts/           7 exact embedded WOFF2 font faces
    logo/            Original seal SVG
  components/
    animations/      Shared scheduler and particles
    common/          Brand lockup, buttons, typed images, section heading,
                     banner, CTA band, count-up and lightbox
    layout/          Header, footer, page curtain, cursor glow, WhatsApp button
  data/              Typed image, ceremony, outfit, brand, contact and
                     showcase (derived stats, gallery, steps) data
  hooks/             Scroll reveal
  pages/             One component per route
  sections/
    Home/            Template home sections
    Collections/     Carousel, look grid, details dialog, orbit, craft
    AboutPage/       Story, pillars, making timeline, studio
    Booking/         Multi-step booking form
    Tracking/        Order status request
    GroomJourney/    Journey chapter data used by the home and about timelines
    HappyGrooms/     Royal Procession detailing and embroidery story
    CeremonyCorridor/
    HeadToToe/
    Collection/
    Devatan/
  styles/            Original CSS (3D pages), template.css (mm- prefixed
                     design system), Tailwind utilities and accessibility fixes
  types/             Shared content types
  utils/             Original math, detail navigation and validation
  App.tsx
  main.tsx
scripts/
  extract-assets.ts  Reproducible asset extraction
reference/
  source-analysis.html  Readable original source with externalized asset paths
  asset-manifest.json   Original/source SHA-256 and image hashes
```

`IMPLEMENTATION_CHECKLIST.md` records the source analysis, animation geometry, feature inventory and verification results.

## Fidelity and animation architecture

The reference used is `C:/Users/Drago/Downloads/mister-mapillai-3d-preview 2.html`. It contains the expected 859 lines, 46 image mappings, seven font faces and all eight sections. The brief names the same file with an additional `(1)` suffix; no such second file was available locally.

`src/styles/original.css` is extracted directly from the reference. Tailwind is configured without preflight so its reset does not change the original typography or geometry. No replacement images, generated artwork or substitute fonts are used.

Images use the full original files by default, including on small displays. Intrinsic dimensions reserve their layout space. Later sections prepare their images with eight measured viewport heights of lookahead. A shared queue limits concurrent asynchronous decoding to two images. Distant preloads use one slot; current imagery has the highest priority. Already prepared images and shared URLs are reused. No additional animation loop is used. The original image files are unchanged; embroidery crops that are only about 150×168 pixels remain limited to that source detail.

The original requestAnimationFrame math is preserved instead of adding GSAP: the source animations are already calculated directly from scroll progress. One shared scheduler drives scene damping, particles and the header. It caches geometry, pauses in hidden tabs and stops when animation has settled. Offscreen scene callbacks and particles stop; promotion hints are released on scene exit. React state changes only when a ceremony or collection item changes; scroll frames update refs and cached DOM styles. Progress bars and the styling scan use transforms rather than per-frame layout changes. Layout-skipping containment is intentionally excluded: Chrome could retain zero-size images after navigating into a skipped 3D scene.

The approved localized WebGL2 renderers cover the corridor floor/walls and the collection cards/reflections. They share the existing scheduler, camera math and easing. Canvases render at the full physical device resolution and collection textures use the original image dimensions without re-encoding or lower-resolution texture levels. The corridor's original image arches, shadows, fog and information panel remain in CSS. Original CSS rendering takes over when WebGL2 is unavailable, a context is lost or the device cannot support the full framebuffer/texture dimensions. Offscreen framebuffers shrink to one pixel; fixed original textures remain reusable until component cleanup.

The original source's decorative styling pins and embroidery markers are real keyboard-accessible buttons here. Activating one scrolls to its matching original animation state. The styling image keeps its original 3D rotation with a flat child compositing plane so Chrome correctly hit-tests its pins. Reduced-motion settings can change live; particles, 3D tilt and CSS motion stop while all content and navigation remain usable.

## Original asset extraction

The extracted assets are already included. To extract again from another local copy of the original:

```sh
npm run extract-assets -- "C:/path/to/mister-mapillai-3d-preview 2.html"
```

This writes the exact binary assets, stylesheet, typed image map and checksums. It also keeps an ignored `reference/original.html` locally for side-by-side browser comparison; that original HTML is not the application's implementation and is not included in `dist/`.
