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
│   ├── assets/                   # Raw & processed visual assets
│   │   ├── fonts/                # Self-hosted WOFF2 web fonts
│   │   │   ├── serif/            # Cormorant Garamond font weights & styles
│   │   │   └── sans-serif/       # Inter Variable & Josefin Sans font files
│   │   ├── hero_frames/          # Original high-res PNG sequence (reference)
│   │   ├── hero_frames_web/      # Optimized WebP 1920×1088 runtime frames (001–192)
│   │   ├── images/               # Production ceremony & collection imagery
│   │   ├── about/                # Artisanal embroidery details & golden shirt
│   │   ├── detail/               # Accessory cut-outs, swatches & orbit assets
│   │   ├── our_works/            # Curated groom lookbook photography
│   │   ├── logo/                 # Vector brand emblems (seal.svg)
│   │   └── lottie/               # Lottie motion graphics (mm-loader.json)
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
│   ├── build-hero-frames.py      # Encodes source frames to WebP with PSNR verification
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
The primary visual asset repository. Assets are categorized strictly by purpose:
- **`fonts/`**: Organized into `serif/` and `sans-serif/` subfolders containing self-hosted `.woff2` files.
- **`hero_frames_web/`**: 192 full-resolution (1920×1088) WebP sequence frames indexed `frame-001.webp` through `frame-192.webp`.
- **`about/`**: Golden embroidered shirt (`devatan-shirt.webp`) and craftsmanship detail swatches (`detail-0.webp`–`detail-4.webp`).
- **`detail/orbit/`**: Cut-outs of accessories (brooch, watch, pocket-square, cufflinks, footwear).
- **`images/`**: High-fidelity collection items, ceremony before/after pairs, and groom portraits.
- **`logo/`**: Vector brand emblem (`seal.svg`).
- **`lottie/`**: Vector motion graphics (`mm-loader.json`).

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
