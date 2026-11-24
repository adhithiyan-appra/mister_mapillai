# Frontend Architecture & Development Guide — Mister Mapillai

This guide details the coding standards, component design patterns, animation architecture, and maintenance guidelines for developers working on the **Mister Mapillai** web application.

---

## 1. Technology Stack

- **Runtime & Framework**: React 19 (`react`, `react-dom`) with strict TypeScript 5.9.
- **Build Tooling**: Vite 7 with `@vitejs/plugin-react` and `@tailwindcss/vite` (Tailwind CSS 4).
- **Animation & Motion**: GSAP 3 (Core + ScrollTrigger), `lottie-web` (lightweight SVG build).
- **Canvas Rendering**: Custom OffscreenCanvas Web Worker (`frameRenderer.worker.ts`) with 2D fallback.
- **Routing**: Custom history-based client router (`src/router.tsx`) supporting clean paths and hash anchors.

---

## 2. Component Development Conventions

### Component Architecture
- **Atomic Presentation Components**: Kept under `src/components/common/` or `src/components/ui/` (`Button`, `CountUp`, `PageBanner`, `SectionHeading`, `SourceImage`). They accept strongly typed props and avoid direct global state mutations.
- **Section Modules**: Kept under `src/sections/<Feature>/` (`HeroSection`, `CollectionCarousel`, `StylingOrbit`, `BookingForm`). Sections encapsulate their own responsive layout and interaction state.
- **Barrel Exports**: Always provide an `index.ts` in each component folder for clean imports:
  ```typescript
  // Preferred
  import { SectionHeading, CountUp } from '../../components/common';
  ```

### Functional Component Rules
- Use pure functions and standard hooks (`useState`, `useEffect`, `useRef`, `useLayoutEffect`).
- Always specify `readonly` on arrays and immutable prop definitions.
- Keep components focused on layout and user interaction; move heavy computations, canvas painting, and image parsing into `src/utils/` or web workers.

---

## 3. Styling & Design System Conventions

### Brand Color Tokens
Always use the standardized CSS custom properties defined in `src/styles/template.css` and `src/styles/fonts.css`:

```css
:root {
  --mm-maroon: #5a0f1c;        /* Primary brand wine/maroon */
  --mm-maroon-dark: #3a0811;   /* Deep background maroon */
  --mm-maroon-light: #7a1a2b;  /* Elevated card fill */
  --mm-gold: #c9a24d;          /* Primary luxury gold */
  --mm-gold-light: #e6c97a;    /* Highlight accent */
  --mm-gold-deep: #9a7426;     /* High-contrast gold for text */
  --mm-cream: #f8f2e7;         /* Warm background cream */
  --mm-ink: #1d1416;           /* Primary text dark */
  --mm-muted: #76665c;         /* Subdued body text */
}
```

### Class Naming Conventions
- Template and marketing classes use the `mm-` prefix (e.g., `.mm-btn`, `.mm-title`, `.mm-story-collage`, `.mm-orbit`).
- Modifiers follow BEM-style syntax: `.mm-btn--dark`, `.mm-story-collage__tile--dome`.
- State classes use `is-` prefix: `.is-in`, `.is-active`, `.is-orbiting`.

### Responsive Breakpoints
Follow standard breakpoints established in `template.css`:
- **Desktop**: `> 900px` (2-column grids, generous margins).
- **Tablet**: `≤ 900px` and `≤ 767px` (1-column collapses, stacked journey timeline).
- **Mobile**: `≤ 640px` and `≤ 480px` (compact cards, reduced padding, no horizontal scroll).

---

## 4. Animation Architecture

### GSAP & ScrollTrigger
- GSAP plugins are registered at the module level:
  ```typescript
  import gsap from 'gsap';
  import { ScrollTrigger } from 'gsap/ScrollTrigger';
  gsap.registerPlugin(ScrollTrigger);
  ```
- Animations are scoped using `useRef` and cleaned up with `gsap.matchMedia()`:
  ```typescript
  useEffect(() => {
    const ctx = gsap.matchMedia();
    ctx.add('(prefers-reduced-motion: no-preference)', () => {
      // Create timelines and ScrollTriggers here
    });
    return () => ctx.revert();
  }, []);
  ```

### Reduced Motion Compliance
Always check `window.matchMedia('(prefers-reduced-motion: reduce)')` or configure CSS `@media (prefers-reduced-motion: reduce)`:
- Avoid pinning sequences or heavy scroll hijacking.
- Supply static poster image fallbacks (`frame-0001.webp`).
- Set transitions and scale transforms to `none`.

### Hero Frame Renderer
- The hero sequence is driven by `src/sections/Home/frameRenderer.ts` and runs inside a worker on an `OffscreenCanvas`.
- Do not add standard interval timers to the hero canvas; frames are drawn strictly in response to scroll delta.

---

## 5. Import Conventions

Organize imports into standard alphabetical groups:

1. External libraries (`react`, `gsap`, etc.)
2. Types and interfaces (`type { JSX } from 'react'`, `type { ImageKey } from '../../data/images'`)
3. Components (`import { SourceImage } from '../../components/common'`)
4. Data and assets (`import { aboutAssets } from '../../data/assets'`)
5. Utilities and constants (`import { APP_ROUTES } from '../../constants'`)
6. Style imports (`import './MySection.css'`)

---

## 6. Code Maintenance & Build Verification

Before committing changes:
1. Run strict type checking and build:
   ```bash
   npm run build
   ```
2. Check that the build completes with code 0.
3. Verify that chunk sizes remain within reasonable bounds and no broken asset paths are emitted.
4. Preview the production build locally:
   ```bash
   npm run preview
   ```
