# Component Architecture & Design Guide — Mister Mapillai

This guide details the component structure, responsibilities, props interfaces, and naming standards for the **Mister Mapillai** component system.

---

## 1. Component Hierarchy & Organization

Components are organized into two primary layers:
1. **Shared Design System Components (`src/components/`)**: Atomic, reusable UI controls, layout chrome, and global animation providers.
2. **Feature Section Modules (`src/sections/`)**: Domain-driven, feature-rich sections specific to pages.

```text
src/
├── components/
│   ├── common/           # Shared presentation elements
│   ├── layout/           # Global application scaffold (Header, Footer, Loaders)
│   ├── animations/       # Animation context & image loading indicators
│   ├── ui/               # Atomic controls (Buttons, Headings, Banners)
│   └── index.ts          # Unified component barrel
│
└── sections/
    ├── Home/             # Home page hero, stats, transformation, gallery
    ├── Collections/      # 3D Collection carousel, styling orbit, look grid
    ├── AboutPage/        # Editorial collage, brand pillars, craftsmanship timeline
    ├── Booking/          # Multi-step consultation booking form
    ├── Tracking/         # Order tracking status & milestones
    └── CeremonyCorridor/ # Immersive ceremony comparison
```

---

## 2. Shared Common & Layout Components

### Layout Components (`src/components/layout/`)
- **`Header`**: Sticky/fixed luxury header with brand lockup, gold active links, ceremony dropdown, and consultation CTA.
- **`Footer`**: Brand closing with contact details, studio hours, social links, and copyright.
- **`SiteLoader`**: Initial full-screen luxury maroon preloader featuring the gold Lottie emblem and animated status ring. On the home page, it synchronizes with the hero frame decoder.
- **`SiteEffects`**: Global micro-interactions:
  - `CursorGlow`: Subtle ambient gold radial glow following mouse pointer on desktop.
  - `PageCurtain`: Silk-like maroon page transition wipe between routes.
  - `WhatsAppButton`: Floating luxury gold/maroon quick-contact action.

### Common Presentation Components (`src/components/common/`)
- **`SourceImage`**: The primary image component. Accepts a typed `asset: ImageKey`, automatically resolves natural dimensions from `imageMetadata.ts` for zero layout shift (CLS), handles responsive `srcSet`, and defers loading until the hero opening sequence completes.
- **`SectionHeading`**: Renders uppercase eyebrow, Cormorant Garamond title with italic accent (`<em>`), optional gold divider line, and introductory lead text.
- **`PageBanner`**: Clean header banner for interior pages (`/about`, `/collections`, `/contact`).
- **`CountUp`**: Smooth numeric counter animation using IntersectionObserver.
- **`Lightbox`**: Accessible modal overlay for high-resolution gallery look inspection with keyboard navigation (`Esc`, `ArrowLeft`, `ArrowRight`).
- **`CtaBand`**: Full-width luxury maroon banner with gold typography inviting visitors to book consultations.
- **`BrandLogo`**: Standardized SVG emblem and typographic lockup (`Mister Mapillai`).

---

## 3. Page Section Modules (`src/sections/`)

### Home Sections (`src/sections/Home/`)
- **`HeroSection`**: Scroll-pinned canvas rendering 192 high-resolution frames (1920×1088) via an OffscreenCanvas worker (`frameRenderer.worker.ts`). Includes static poster fallback for reduced motion.
- **`StatsSection`**: Grid of four brand milestones (1200+ Grooms Styled, 12+ Years of Craft, 100% Bespoke Fit, 1 Designer).
- **`TransformationSection`**: Interactive before-and-after slider comparing original inspiration with bespoke ceremony realization.
- **`JourneySection`**: Five-step luxury horizontal timeline (*Consultation → Design → Measurement → Stitching & Trials → Wedding Ready*).
- **`GallerySection`**: Dynamic masonry lookbook gallery with lightbox integration.
- **`TestimonialsSection`**: Client portraits and wedding reviews with star ratings and verified groom locations.

### Collections Sections (`src/sections/Collections/`)
- **`CollectionCarousel`**: Premium 3D rotating carousel displaying exactly 3 collection cards at a time (left, center, right) rotating through all 13 signature outfits.
- **`StylingOrbit`**: Interactive orbital accessory visualization mapping rotating peripheral accessories around the central groom portrait.
- **`LookGrid`**: Occasion-filterable lookbook grid with modal detail inspection (`LookDialog`).
- **`CraftSection`**: Handcraftsmanship showcase with artisanal tailoring milestones.

### About Us Sections (`src/sections/AboutPage/`)
- **`BrandStory`**: Luxury editorial craftsmanship collage with the centered full-view golden embroidered shirt (`devatan-shirt.webp`), 7 surrounding detail swatches, and the anchored `12+ Years of Craft` maroon badge.
- **`BrandPillars`**: Three interactive pillars (*Why. What. How.*) with hover reveals.
- **`MakingTimeline`**: Vertical craftsmanship narrative with scroll-driven gold thread progress indicator.
- **`StudioSection`**: Chennai atelier address, map, hours, and booking CTA.

### Booking & Tracking (`src/sections/Booking/` & `src/sections/Tracking/`)
- **`BookingForm`**: Four-step consultation wizard with validation, occasion multi-select, and direct WhatsApp / Instagram dispatch.
- **`TrackOrder`**: Live pipeline tracker displaying garment progress from pattern cutting to final fitting.

---

## 4. Component Naming & Authoring Standards

1. **PascalCase Naming**: Component files and functions must use PascalCase (e.g., `SectionHeading.tsx`, `CollectionCarousel.tsx`).
2. **Prop Interfaces**: Define props in an explicit interface above the component function (e.g., `interface SectionHeadingProps`).
3. **No Inline Anonymous Components**: Keep sub-components named and clear.
4. **Accessible Semantics**: Always include proper ARIA roles (`role="dialog"`, `aria-labelledby`, `aria-hidden="true"` on decorative elements).
5. **Barrel Exports**: Add all new components to the corresponding `index.ts` barrel.
