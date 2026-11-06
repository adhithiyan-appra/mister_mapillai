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

## Source layout

```text
src/
  assets/
    images/          46 exact extracted WebP assets
    fonts/           7 exact embedded WOFF2 font faces
    logo/            Original seal SVG
  components/
    animations/      Shared scheduler, particles and travelling seal
    common/          Brand lockup, buttons and typed images
    layout/          Fixed header and footer
  data/              Typed image, ceremony, collection and embroidery data
  sections/
    GroomJourney/    All nine chapters and their 3D objects
    About/
    CeremonyCorridor/
    HeadToToe/
    Collection/
    Devatan/
    Story/
    Consultation/    Controlled React form
  styles/            Original CSS, Tailwind utilities and accessibility fixes
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

The reference used is `C:/Users/Drago/Downloads/mister-mapillai-3d-preview 2.html`. It contains the expected 859 lines, 46 image mappings, seven font faces, nine journey chapters and all eight sections. The brief names the same file with an additional `(1)` suffix; no such second file was available locally.

`src/styles/original.css` is extracted directly from the reference. Tailwind is configured without preflight so its reset does not change the original typography or geometry. No replacement images, generated artwork or substitute fonts are used.

Images use the full original files by default, including on small displays. Intrinsic dimensions reserve their layout space. Hidden journey imagery is loaded two chapters ahead; later sections prepare their images with eight measured viewport heights of lookahead. A shared queue limits concurrent asynchronous decoding to two images. Distant preloads use one slot, leaving room for approaching chapters; current imagery has the highest priority. Already prepared images and shared URLs are reused. No additional animation loop is used. The original image files are unchanged; embroidery crops that are only about 150×168 pixels remain limited to that source detail.

The original requestAnimationFrame math is preserved instead of adding GSAP: the source animations are already calculated directly from scroll progress. One shared scheduler drives scene damping, particles, the seal and the header. It caches geometry, derives the moving seal bounds from the original sticky positions, pauses in hidden tabs and stops when animation has settled. Offscreen scene callbacks and particles stop; promotion hints are released on scene exit. React state changes only when a ceremony or collection item changes; scroll frames update refs and cached DOM styles. Progress bars and the styling scan use transforms rather than per-frame layout changes. Layout-skipping containment is intentionally excluded: Chrome could retain zero-size images after navigating into a skipped 3D scene.

The approved localized WebGL2 renderers cover the corridor floor/walls and the collection cards/reflections. They share the existing scheduler, camera math and easing. Canvases render at the full physical device resolution and collection textures use the original image dimensions without re-encoding or lower-resolution texture levels. The corridor's original image arches, shadows, fog and information panel remain in CSS. Original CSS rendering takes over when WebGL2 is unavailable, a context is lost or the device cannot support the full framebuffer/texture dimensions. Offscreen framebuffers shrink to one pixel; fixed original textures remain reusable until component cleanup.

The original source's decorative styling pins and embroidery markers are real keyboard-accessible buttons here. Activating one scrolls to its matching original animation state. The styling image keeps its original 3D rotation with a flat child compositing plane so Chrome correctly hit-tests its pins. Reduced-motion settings can change live; particles, 3D tilt and CSS motion stop while all content and navigation remain usable.

## Original asset extraction

The extracted assets are already included. To extract again from another local copy of the original:

```sh
npm run extract-assets -- "C:/path/to/mister-mapillai-3d-preview 2.html"
```

This writes the exact binary assets, stylesheet, typed image map and checksums. It also keeps an ignored `reference/original.html` locally for side-by-side browser comparison; that original HTML is not the application's implementation and is not included in `dist/`.
