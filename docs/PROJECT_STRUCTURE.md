# Project Structure — Mister Mapillai

This document provides a comprehensive architectural map of the **Mister Mapillai** luxury groom wear codebase, explaining the role and responsibility of each directory and system module.

---

## High-Level Architecture Overview

```text
mister_mappilai/
│
├── public/                       # Static files served directly at root (/)
│   ├── favicon.svg               # Vector brand emblem favicon
│   ├── seal.svg                  # Brand crest SVG
│   ├── robots.txt                # Search engine crawler policies
│   ├── sitemap.xml               # XML sitemap for SEO discovery
│   └── site.webmanifest          # PWA / browser configuration
│
├── src/                          # Application source code
│   ├── assets/                   # Visual assets, organised by where the site uses them (see docs/ASSET_GUIDE.md)
│   │   ├── animations/           # hero-frames/ (webp_v2/ runtime lossless WebP, new_v2/ master PNG) and lottie/ (loader)
│   │   ├── brand/logos/          # Brand seal emblem (seal.svg)
│   │   ├── fonts/                # Self-hosted WOFF2 web fonts (serif/, sans-serif/)
│   │   └── images/               # collections/, home/, about/, real-grooms/, testimonials/, accessories/, shared/
│   │
│   ├── components/               # Modular React UI components
│   │   ├── common/               # Shared presentation components (SectionHeading, Lightbox, etc.)
│   │   ├── layout/               # Global layout chrome (Header, Footer, SiteLoader, SiteEffects)
│   │   ├── animations/           # AnimationProvider (GSAP context) & ImageLoading
│   │   ├── ui/                   # Reusable atom-level controls (Button, CountUp, etc.)
│   │   └── index.ts              # Unified component barrel export
│   │
│   ├── pages/                    # Top-level view controllers & route screens
│   │   ├── HomePage.tsx          # Hero sequence, stats, transformations, testimonials, lookbook
│   │   ├── CollectionsPage.tsx   # 3D Collection carousel, craft narrative, accessory orbit
│   │   ├── AboutPage.tsx         # Brand story, editorial collage, pillars, making timeline
│   │   ├── CeremoniesPage.tsx    # Ceremonial look selection & corridor comparison
│   │   ├── ContactPage.tsx       # Studio consultation & appointment booking
│   │   ├── TrackOrderPage.tsx    # Real-time bespoke garment tracking
│   │   ├── NotFoundPage.tsx      # 404 fallback page
│   │   └── index.ts              # Unified pages barrel export
│   │
│   ├── sections/                 # Domain-driven section modules
│   │   ├── Home/                 # HeroSection, StatsSection, TransformationSection, etc.
│   │   ├── Collections/          # CollectionCarousel, StylingOrbit, LookGrid, LookDialog
│   │   ├── AboutPage/            # AboutSections (Story, Pillars, Timeline), StudioSection
│   │   ├── Booking/              # BookingForm interactive multi-step wizard
│   │   ├── Tracking/             # TrackOrder status lookup and timeline view
│   │   ├── CeremonyCorridor/     # WebGL/OffscreenCanvas ceremony comparison
│   │   ├── HeadToToe/            # Complete accessory styling showcase
│   │   └── index.ts              # Unified sections barrel export
│   │
│   ├── data/                     # Content models, asset mappings & registries
│   │   ├── assets/               # Domain-specific asset modules (about, collections, etc.)
│   │   ├── images.ts             # Central type-safe ImageKey registry
│   │   ├── imageMetadata.ts      # Intrinsic widths and heights for zero-layout-shift
│   │   ├── imageSources.ts       # Responsive srcSet and deferred loading resolvers
│   │   ├── brand.ts              # Brand narrative, promises and pillar copy
│   │   ├── ceremonies.ts         # Ceremony specifications (Muhurtham, Reception, etc.)
│   │   ├── outfits.ts            # Detailed garment specifications, fabrics and trims
│   │   ├── orders.ts             # Sample tracking database & milestone data
│   │   ├── navigation.ts         # Primary navigation links and page metadata
│   │   └── testimonials.ts       # Groom reviews, ratings and locations
│   │
│   ├── styles/                   # Modular design system & stylesheets
│   │   ├── fonts.css             # Centralized @font-face and font-family tokens
│   │   ├── utilities.css         # Minimal CSS resets and utility helper classes
│   │   ├── original.css          # Immersive 3D corridor system & root CSS tokens
│   │   ├── template.css          # Core brand template rules (maroon, gold, cream, responsive)
│   │   ├── pages.css             # Page-specific layouts and overrides
│   │   ├── performance.css       # Hardware acceleration, will-change, and composite layers
│   │   ├── accessibility.css     # High-contrast focus outlines and reduced-motion overrides
│   │   └── index.css             # Unified CSS cascade entry point
│   │
│   ├── hooks/                    # Reusable React hooks
│   │   ├── useReveal.ts          # Scroll-triggered view entrance animations
│   │   └── index.ts              # Hooks barrel export
│   │
│   ├── constants/                # System constants (APP_ROUTES, BRAND_COLORS, TIMING)
│   ├── config/                   # Site settings, contact info, social metadata
│   ├── types/                    # Core TypeScript domain models
│   ├── utils/                    # Animation, GPU rendering, image bootstrap & validation helpers
│   ├── router.tsx                # Client-side history router with hash navigation
│   ├── App.tsx                   # Root application scaffold with animation & router providers
│   └── main.tsx                  # Vite application entry point
│
├── docs/                         # Technical guides and architecture documentation
│   ├── PROJECT_STRUCTURE.md      # This file
│   ├── ASSET_GUIDE.md            # Image management, optimization & sequence guidelines
│   ├── FONT_GUIDE.md             # Typography hierarchy, font files & loading strategies
│   ├── DEVELOPMENT_GUIDE.md      # Coding conventions, component design & styling rules
│   └── screenshots/              # Automated verification captures
│
├── scripts/                      # Developer tooling & build automation
│   ├── build-hero-frames.py      # Encodes the hero master frames to lossless WebP, verified pixel-exact, with a manifest
│   ├── convert-lossless-webp.py  # PNG originals -> verified lossless WebP (+ right-sized renditions)
│   ├── extract-assets.ts         # Asset extraction and categorization tool
│   ├── image-metadata.ts         # Automated intrinsic image dimension extractor
│   └── verify-site.mjs           # E2E validation script
│
├── index.html                    # Root HTML document with critical inline preloader
├── vite.config.ts                # Vite build configuration, plugins & hero preload injection
├── tsconfig.json                 # TypeScript compiler configuration (strict mode)
├── package.json                  # Dependencies and build scripts
└── README.md                     # Project overview and quickstart guide
```

---

## Detailed Directory Responsibilities

### 1. `public/`
Contains static web files served at the root URL path (`/`). Used for search engine discovery (`robots.txt`, `sitemap.xml`), browser icons (`favicon.svg`, `seal.svg`), and application manifest (`site.webmanifest`). Files here are never hashed or bundled by Vite.

### 2. `src/assets/`
The primary visual asset repository, organised by where the website uses each file. The full tree, naming rules, how to add assets and the file-by-file inventory are in `docs/ASSET_GUIDE.md` and `docs/asset-inventory.csv`.
- **`animations/hero-frames/webp_v2/`**: the 197 runtime hero frames (1920×1088 lossless WebP), `frame_0001.webp` … `frame_0197.webp`, with `manifest.json`; `new_v2/` holds the master PNGs. (`new_v1/`, `new_v1_webp/`, `web/` and `source/` are earlier sequences, no longer loaded.)
- **`animations/lottie/`**: the loader animation (`mm-loader.json`).
- **`brand/logos/`**: vector brand emblem (`seal.svg`).
- **`fonts/`**: `serif/` and `sans-serif/` subfolders of self-hosted `.woff2` files.
- **`images/collections/`**: the 13 signature looks (`looks/`) and their wide crops (`wide/`).
- **`images/home/before-after/`**: the "before" images of the Before & After slider.
- **`images/about/`**: the Our Story collage (`our-story/`) and the How We Make step images (`how-we-make/`).
- **`images/real-grooms/`**: the Real Grooms gallery as lossless WebP (`webp/`, with 640 px renditions in `webp/sm/`; what the site loads) with its PNG originals (`gallery/`, masters), and the Mr. Gowtham case study (`happy-groom-story/`).
- **`images/testimonials/`**, **`images/accessories/`** (orbit cut-outs and originals), **`images/shared/`** (assets used by several sections).

### 3. `src/components/`
Modular, reusable React components split into clear responsibilities:
- **`common/`**: Brand presentation components shared across multiple pages (`BrandLogo`, `CountUp`, `CtaBand`, `Lightbox`, `SectionHeading`, `SourceImage`).
- **`layout/`**: Global application scaffold (`Header`, `Footer`, `SiteLoader`, `CursorGlow`, `PageCurtain`, `WhatsAppButton`).
- **`animations/`**: Context and orchestration (`AnimationProvider`, `useAnimationController`, `ImageLoading`).
- **`ui/`**: Reusable atom controls (`Button`, `CountUp`, `CtaBand`, `PageBanner`).

### 4. `src/data/`
Pure data models and configuration separate from UI components:
- **`assets/`**: Domain-specific asset bundles (`aboutAssets`, `collectionAssets`, `accessoryAssets`, `testimonialAssets`, `transformationAssets`, `happyGroomsAssets`, `ceremonyAssets`, `brandAssets`).
- **`images.ts`**: The central mapping connecting `ImageKey` string literals to imported asset URLs.
- **`imageMetadata.ts`**: Pre-computed intrinsic dimensions (`width`, `height`) for all images to guarantee zero cumulative layout shift (CLS).
- **`brand.ts`**, **`ceremonies.ts`**, **`outfits.ts`**, **`orders.ts`**: Verbatim editorial content.

### 5. `src/styles/`
Modular CSS architecture with a strict cascading order:
1. `fonts.css`: `@font-face` definitions and root font variables (`--font-primary`, `--font-secondary`, `--font-display`).
2. `utilities.css`: Lightweight utility helper classes.
3. `original.css`: Immersive 3D page styles and color tokens.
4. `accessibility.css`: Screen reader tokens, high-contrast focus rings, and `prefers-reduced-motion` fallbacks.
5. `performance.css`: Hardware-accelerated composite layer rules.
6. `pages.css`: Route-specific container dimensions and layouts.
7. `template.css`: Luxury brand styling (deep maroon `#3a0811`, gold `#c9a24d`, cream `#f8f2e7`).

### 6. `src/sections/`
Self-contained, feature-level page sections organized by domain. Each section encapsulates its own layout, interactions, and local state while leveraging shared components and data models.
