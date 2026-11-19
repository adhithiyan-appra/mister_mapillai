# Recon — mister_mappilai

_Generated 2026-11-19 10:52 UTC · read-only pass · verify before reporting_

## Repository

- Branch: `main`
- Last commit: b2c35eb 2026-11-18 change the ui based html files
- Commits: 5
- Contributors: 1
- Uncommitted changes: 30 file(s)

## Tree (depth 3)

```
.
./audit
./docs
./public
./reference
./scripts
./src
./src/assets
./src/assets/about
./src/assets/detail
./src/assets/fonts
./src/assets/hero_frames
./src/assets/hero_frames_web
./src/assets/images
./src/assets/logo
./src/assets/lottie
./src/assets/our_works
./src/components
./src/components/animations
./src/components/common
./src/components/layout
./src/data
./src/hooks
./src/pages
./src/sections
./src/sections/AboutPage
./src/sections/Booking
./src/sections/CeremonyCorridor
./src/sections/Collections
./src/sections/Devatan
./src/sections/GroomJourney
./src/sections/HappyGrooms
./src/sections/HeadToToe
./src/sections/Home
./src/sections/Tracking
./src/styles
./src/types
./src/utils
```

## Languages by file count

```
    285 webp
    222 png
     47 tsx
     32 ts
     20 woff2
      9 css
      5 json
      4 md
      3 svg
      2 txt
      2 html
      1 xml
      1 mjs
      1 example
```

## Largest source files

Candidates for the code-quality phase (size alone is not a finding).
```
   661 ./src/sections/Home/ourWorksGallery.ts
   513 ./src/sections/Home/frameRenderer.ts
   500 ./src/sections/Booking/BookingForm.tsx
   301 ./src/data/outfits.ts
   299 ./src/utils/imageLoading.ts
   293 ./src/sections/CeremonyCorridor/CeremonyCorridor.tsx
   282 ./src/sections/Home/TransformationSection.tsx
   256 ./src/sections/Collections/CollectionCarousel.tsx
   228 ./src/components/animations/AnimationProvider.tsx
   211 ./src/sections/AboutPage/AboutSections.tsx
   185 ./src/data/images.ts
   183 ./src/data/showcase.ts
   169 ./src/sections/Home/TestimonialsSection.tsx
   169 ./src/sections/Home/HeroSection.tsx
   159 ./src/sections/Home/heroFrames.ts
   155 ./src/sections/Tracking/TrackOrder.tsx
   155 ./src/sections/HappyGrooms/HappyGroomsStory.tsx
   151 ./src/sections/Home/GallerySection.tsx
   124 ./src/data/ceremonies.ts
   118 ./src/components/common/Lightbox.tsx
```

## Manifests and configuration present

- `package.json`
- `package-lock.json`
- `tsconfig.json`
- `vite.config.ts`
- `.env.example`
- `README.md`

## Scripts

```json
  "scripts": {
    "dev": "vite --host 127.0.0.1",
    "build": "tsc -b && vite build",
    "preview": "vite preview --host 127.0.0.1",
    "extract-assets": "node scripts/extract-assets.ts"
  },
```

## Dependencies (direct)

```
```

## Likely entry points

Confirm and expand into the full inventory in phase 1.
```
```

## Database and schema artifacts

```
```

## Auth-related files

```
```

## Test files

Test files found: **0**
```
```

## Flags to verify

- No CI configuration found.
- No test files found.

Debt markers (TODO/FIXME/HACK/XXX) by file:
```
./package-lock.json:1
```

Possible hardcoded secrets (**patterns, not proof — open each file before reporting**).
Reference these in the report by file:line and a short prefix only. Never paste full values:
```
./src/sections/Home/TransformationSection.tsx:166:    const token = ++requestRef.current;
```

Client-exposed env vars (shipped to the browser — confirm none are secrets):
```
VITE_CONTACT_ADDRESS
VITE_CONTACT_EMAIL
VITE_CONTACT_HOURS
VITE_CONTACT_PHONE
VITE_WHATSAPP_NUMBER
```

## Next

Read `references/investigation.md` and build the entry point inventory.
