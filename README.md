# Mister Mapillai — Bespoke Groom Wear

A React 19 and strict TypeScript web application for **Mister Mapillai** (Est. 2014) — luxury South Indian bespoke groom wear, sherwanis, bandhgalas, suits, silk shirts, and pattu veshtis, styled head to toe for every ceremony from Muhurtham to Reception.

---

## 1. Quickstart & Local Development

### Prerequisites
- **Node.js**: v20+ (Node.js 24 recommended)
- **npm**: v10+

### Installation & Run
```bash
# Install dependencies
npm ci

# Start development server
npm run dev
```

The application runs locally on `http://127.0.0.1:5173`.

### Production Build & Preview
```bash
# Run strict TypeScript check and Vite production build
npm run build

# Preview production build locally
npm run preview
```

The compiled, minified production assets are emitted into `dist/`. The output is 100% static and can be served on any modern CDN or static web host (Vercel, Netlify, Cloudflare Pages, S3/CloudFront).

---

## 2. Technology Stack

- **Framework**: React 19 (`react`, `react-dom`) with strict TypeScript 5.9.
- **Build System**: Vite 7 with `@vitejs/plugin-react` and `@tailwindcss/vite` (Tailwind CSS 4).
- **Motion & Animations**: GSAP 3 (ScrollTrigger, timelines), `lottie-web` (lightweight SVG preloader).
- **Canvas Rendering**: Custom Web Worker (`frameRenderer.worker.ts`) and `OffscreenCanvas` with 2D fallback.
- **Routing**: History-based client-side router (`src/router.tsx`) with hash-scroll and popstate synchronization.
- **Styling**: Modular CSS design system with centralized `@font-face` typography (`src/styles/fonts.css`) and luxury palette tokens (maroon `#3a0811`, gold `#c9a24d`, cream `#f8f2e7`).

---

## 3. Project Structure

```text
mister_mappilai/
├── public/                       # Static web assets (favicon, robots.txt, sitemap.xml, site.webmanifest)
├── src/                          # Application source code
│   ├── assets/                   # Media assets, organised by where the site uses them (docs/ASSET_GUIDE.md)
│   │   ├── animations/           # hero-frames/ (web/ runtime WebP, source/ master PNG) and lottie/ (loader)
│   │   ├── brand/logos/          # Official vector seal emblem (seal.svg)
│   │   ├── fonts/                # Self-hosted WOFF2 fonts (serif/ and sans-serif/)
│   │   └── images/               # collections/, home/, about/, real-grooms/, testimonials/, accessories/, shared/
│   ├── components/               # Modular presentation & layout components
│   │   ├── common/               # Shared UI elements (BrandLogo, CountUp, Lightbox, etc.)
│   │   ├── layout/               # Header/Navbar, Footer, SiteLoader, SiteEffects
│   │   ├── navigation/           # Navigation bar wrappers
│   │   ├── animations/           # AnimationProvider (GSAP context) & ImageLoading
│   │   └── ui/                   # Reusable atom-level controls (Button, PageBanner, etc.)
│   ├── pages/                    # Route pages (Home, Collections, About, Ceremonies, Contact, TrackOrder)
│   ├── sections/                 # Domain-driven sections (Home, Collections, AboutPage, Booking, etc.)
│   ├── data/                     # Content models & domain asset modules (assets/, images.ts, metadata)
│   ├── styles/                   # Modular design system (fonts.css, template.css, original.css, etc.)
│   ├── hooks/                    # Custom React hooks (useReveal)
│   ├── constants/                # App routes, brand colors, timing constants
│   ├── config/                   # Site metadata & studio contact configuration
│   ├── types/                    # Domain TypeScript models
│   ├── utils/                    # Animation, GPU rendering, image bootstrap & validation helpers
│   ├── router.tsx                # History router implementation
│   ├── App.tsx                   # Root application scaffold
│   └── main.tsx                  # Application entry point
├── docs/                         # Technical architecture documentation
│   ├── PROJECT_STRUCTURE.md      # Detailed folder hierarchy & responsibilities
│   ├── ASSET_GUIDE.md            # Image management & hero frame sequence guidelines
│   ├── FONT_GUIDE.md             # Typography hierarchy, font files & loading strategy
│   └── DEVELOPMENT_GUIDE.md      # Component conventions, styling rules & animations
├── scripts/                      # Developer tooling & asset extraction
├── index.html                    # Root HTML document with critical hero preloader
├── vite.config.ts                # Vite build configuration & HTML transforms
├── tsconfig.json                 # TypeScript strict compiler options
└── package.json                  # Dependencies & scripts
```

For an in-depth breakdown of every folder, see [docs/PROJECT_STRUCTURE.md](docs/PROJECT_STRUCTURE.md).

---

## 4. Documentation Guides

- **[Project Structure](docs/PROJECT_STRUCTURE.md)**: Comprehensive responsibility map for all source directories.
- **[Asset Management Guide](docs/ASSET_GUIDE.md)**: Rules for adding images, naming conventions, optimization standards, and hero sequence compilation.
- **[Typography & Font Guide](docs/FONT_GUIDE.md)**: Self-hosted WOFF2 font setup, weights, styles, and CSS custom property architecture.
- **[Development Guide](docs/DEVELOPMENT_GUIDE.md)**: Coding conventions, component creation, GSAP motion patterns, and build verification.

---

## 5. Consultation Delivery Configuration

Copy `.env.example` to `.env.local` to configure studio messaging:

```dotenv
# Studio WhatsApp number: country code and digits only (e.g. 919876543210).
# Leave empty to copy the consultation request for Instagram instead.
VITE_WHATSAPP_NUMBER=919940026888

# Optional studio details
VITE_CONTACT_PHONE=+91 99400 26888
VITE_CONTACT_EMAIL=vanakkam@mistermapillai.com
VITE_CONTACT_ADDRESS=Mister Mapillai Studio, Chennai, Tamil Nadu
VITE_CONTACT_HOURS=Mon – Sun · 10 AM – 9 PM
```

- **Configured**: Generates and opens a pre-composed WhatsApp message detailing the groom's wedding date, city, selected ceremonies, and custom notes.
- **Empty / Denied**: Automatically copies the structured booking message to the user's clipboard and provides a one-click redirect to Instagram DM.

---

## 6. Hero Frame Sequence System

The home page hero features a high-performance scroll-driven sequence of 202 frames (1920×1088):

1. **Source Frames**: 202 master PNG frames stored in `src/assets/animations/hero-frames/new_v1/` (never modified).
2. **Web Encoding**: `python scripts/build-hero-frames.py` generates genuine lossless WebP frames (`frame-0001.webp` … `frame-0202.webp`) and `manifest.json` (the exact frame order) in `src/assets/animations/hero-frames/new_v1_webp/`, and verifies every frame is pixel-identical to its PNG.
3. **Progressive loading**: lossless frames are ~0.85 MB each (172 MB in all), so only the frames around the scroll position are fetched (plus a short idle warm-up); see `docs/HERO_FRAME_REPLACEMENT_AND_PERFORMANCE_REPORT.md`.
4. **OffscreenCanvas Worker**: `src/sections/Home/frameRenderer.worker.ts` handles fetching, off-thread `createImageBitmap` decoding, and canvas drawing without blocking the main React thread.
5. **Vite HTML Transform**: `vite.config.ts` injects a dynamic `<link rel="preload" as="image" fetchpriority="high">` tag for `frame-0001.webp` on the root route, eliminating render delays on initial visit.
6. **Reduced Motion**: Respects `prefers-reduced-motion` by disabling pinning and sequence downloads, presenting a static hero poster.

---

## 7. Deployment Instructions

1. Run the production build:
   ```bash
   npm run build
   ```
2. Deploy the generated `dist/` directory to your static host:
   - **Vercel**: `vercel deploy --prod`
   - **Netlify**: `netlify deploy --prod --dir=dist`
   - **Cloudflare Pages**: Set build output directory to `dist`
   - **AWS S3 / CloudFront**: Upload contents of `dist/` and configure custom error responses to route `404` to `/index.html` (for client routing).

---

## 8. License

Private proprietary codebase for **Mister Mapillai**. All rights reserved.
