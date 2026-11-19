# Application Audit — Mister Mapillai

**Date:** 2026-11-19 · **Scope:** responsive/frontend audit and implementation across all routes, viewports and key interactions · **Environment:** local static build served via Chrome/CDP at `127.0.0.1:4177`

## 1. Executive summary

The responsive correctness work is complete. The final browser sweep covered 7 routes across 15 viewport profiles (105 page/viewport records), including touch emulation, a 2× DPR phone profile, short landscape viewports and a 2560px desktop. It found zero horizontal overflow, zero offscreen content, zero clipped text, zero broken images, zero console errors, zero network errors and zero page exceptions. Touch and sub-1100px viewports have zero small-target failures, and the previously identified sub-24px desktop targets were fixed; the strict 44px audit threshold still flags desktop-pointer elements, but the minimum measured target is now 24×24px.

The most important usability fixes were in the mobile menu and interaction targets. `src/components/layout/Header.tsx:37-78` now locks background scroll, traps Tab focus, closes on Escape or desktop resize, restores the scroll position and returns focus to the menu button. `src/styles/template.css:690-705` and `src/sections/CeremonyCorridor/CeremonyComparison.css:311-370` supply 44px minimum hit areas on touch/coarse viewports and 24px desktop minimums. Carousel dots were rebuilt as 24×24px buttons with a visual `::after` dot, preserving the luxury look while making the control usable.

The carousel visibility work is stable. `src/sections/Collections/CollectionCarousel.tsx:18-33,77-88` now computes wrapped distance-based opacity and visibility, so exactly three cards are visible at rest and adjacent cards cross-fade during rotation. The dedicated spin verifier passed all assertions including rapid rotation, autoplay, drag and responsive layout.

The main remaining risk is performance, not layout. `npm run build` passes and emits a static site, but Vite warns about a 525.79 kB main JS chunk, and several PNG assets are 1.4–2.7 MB each. These are not responsive breakages, but they are likely to dominate mobile load time. There is also no committed test script, and one accessibility mismatch remains: occasion cards flip on CSS hover without updating React state or `aria-pressed`.

From a responsive-correctness perspective the site is safe to ship. Performance debt and the hover/ARIA mismatch should be scheduled as the next sprint’s work rather than treated as blockers to this responsive release.

## 2. Scores at a glance

| Domain | Score | Coverage | Critical | High | Medium | Low |
|---|---|---|---|---|---|---|
| Architecture | 100/100 | Full frontend-static scope | 0 | 0 | 0 | 0 |
| Performance | 86/100 | Static-only; no Lighthouse/throttling | 0 | 1 | 1 | 0 |
| UI/UX & accessibility | 94/100 | Full responsive sweep | 0 | 0 | 1 | 2 |
| Testing | 96/100 | Full browser QA; no unit suite | 0 | 0 | 1 | 0 |
| Code quality | 98/100 | Partial CSS-focused review | 0 | 0 | 0 | 2 |
| **Responsive production readiness** | **94/100** | Derived from scored domains above | — | — | — | — |

Scoring arithmetic:
- Performance: `100 - (1×10 High) - (1×4 Medium) = 86/100`
- UI/UX: `100 - (1×4 Medium) - (2×1 Low) = 94/100`
- Testing: `100 - (1×4 Medium) = 96/100`
- Code quality: `100 - (2×1 Low) = 98/100`
- Responsive production readiness: `(86 + 94 + 96 + 98) / 4 = 93.5 → 94/100`

Security and database are not scored because the application has no backend, database or auth boundary in this repository.

## 3. Must fix before production

No responsive blockers remain.

Highest-priority non-blocking work:
1. **PERF-001** — Convert/compress multi-megabyte PNG assets (High, M).
2. **UX-001** — Align occasion-card hover state with `aria-pressed` (Medium, S).
3. **PERF-002** — Split the 525.79 kB main JS chunk (Medium, M).
4. **TEST-001** — Add a committed `test` script/CI gate for site and responsive QA (Medium, M).

## 4. System overview

- **VERIFIED** React 19, strict TypeScript 5.9, Vite 7, Tailwind CSS 4, GSAP, Lottie and a custom Web Worker canvas renderer (`README.md:39-44`, `vite.config.ts:3-7`).
- **VERIFIED** Custom history router with canonical paths and legacy redirects (`src/router.tsx:25-40`), not React Router.
- **VERIFIED** Fully static production output with generated route HTML, robots.txt and sitemap.xml (`npm run build`: `SEO pages: 6; sitemap URLs: 5`).
- **VERIFIED** Stylesheet order is fonts → utilities → original → accessibility → performance → pages → template (`src/main.tsx:7-13`).
- **VERIFIED** Responsive styling is concentrated in `src/styles/template.css`, with page-level layout in `src/styles/pages.css`.

## 5. Findings by domain

### 5.1 Architecture (ARCH)

#### [ARCH-001] Frontend-only static application with build-time SEO
- **Severity:** Info
- **Confidence:** VERIFIED
- **Where:** `src/router.tsx:25-40`, `scripts/generate-seo.mjs`
- **Evidence:** Client-side routing resolves known paths and legacy redirects; build output reports `SEO pages: 6; sitemap URLs: 5`.
- **Impact:** No server-side auth/data boundary exists. Static hosting must rewrite unknown paths to `index.html` for the client 404 route.
- **Fix:** Document host rewrite requirements during deployment.
- **Effort:** S

#### [ARCH-002] Responsive styles are concentrated in a mature global stylesheet
- **Severity:** Info
- **Confidence:** VERIFIED
- **Where:** `src/styles/template.css`, `src/styles/pages.css`, `src/styles/original.css`
- **Evidence:** Navigation, target and component rules live in `template.css`; page-level layout and nav-offset rules live in `pages.css`.
- **Impact:** Responsive behavior is centralized but global specificity requires regression testing.
- **Fix:** Keep `audit/scratch/responsive-audit.mjs` as a post-CSS verification step.
- **Effort:** S

### 5.4 Performance (PERF)

#### [PERF-001] Several multi-megabyte raster assets are shipped in the production bundle
- **Severity:** High
- **Confidence:** VERIFIED
- **Where:** `dist/assets/*.png`; `src/data/assets/accessories.ts:10-12`, `src/sections/AboutPage/AboutSections.tsx:44,53`, `src/data/testimonials.ts:15,22,29`, `src/sections/Home/ourWorksGallery.ts:44-73`
- **Evidence:** Build output includes `belt-Gy1wd7zF.png` at 2,669.93 kB, `image1-DkZ7SSAa.png` at 2,556.02 kB, `imagei-WAC-VllO.png` at 2,353.66 kB, `imagee-rIxMLEyp.png` at 2,234.28 kB and eight further assets above 1.4 MB.
- **Impact:** Mobile visitors may download several megabytes of imagery, dominating LCP and data cost.
- **Fix:** Convert to WebP/AVIF, add responsive `srcset` variants, lazy-load below-the-fold images and use dimensions from `src/data/imageMetadata.ts`.
- **Effort:** M

#### [PERF-002] Main JavaScript chunk exceeds Vite's 500 kB warning threshold
- **Severity:** Medium
- **Confidence:** VERIFIED
- **Where:** `dist/assets/index-sHwbA7Rm.js`, `vite.config.ts:31-39`
- **Evidence:** `npm run build` reported `525.79 kB │ gzip: 170.82 kB` and the 500 kB chunk warning.
- **Impact:** Entry parse/execution cost is high for a static marketing site on low-end phones.
- **Fix:** Route-level code splitting and/or `manualChunks` for animation/Lottie dependencies. Preserve the hero preload at `vite.config.ts:17-28`.
- **Effort:** M

#### [PERF-003] Hero poster preload is present and scoped to the home route
- **Severity:** Info
- **Confidence:** VERIFIED
- **Where:** `vite.config.ts:17-28`
- **Evidence:** High-priority preload is injected only for `/`.
- **Impact:** Hero poster request starts during HTML parsing.
- **Fix:** None required.
- **Effort:** S

### 5.5 UI/UX & accessibility (UX)

#### [UX-001] Occasion card hover state desynchronizes from React state and ARIA
- **Severity:** Medium
- **Confidence:** VERIFIED
- **Where:** `src/sections/Home/OccasionsSection.tsx:18-24`, `src/styles/template.css:177-178`
- **Evidence:** CSS `:hover` rotates the card while `flipped` and `aria-pressed` change only on click/keydown.
- **Impact:** Pointer users see the back face while assistive technology still reports the front state.
- **Fix:** Update state on pointer enter/leave as well, or remove the CSS-only hover flip.
- **Effort:** S

#### [UX-002] Navigation offset tokens disagree by 4px
- **Severity:** Low
- **Confidence:** VERIFIED
- **Where:** `src/styles/template.css:27`, `src/styles/pages.css:449,455`
- **Evidence:** `--mm-nav-h: 74px` vs literal `78px`.
- **Impact:** Small anchor/banner offset error, most noticeable on short viewports.
- **Fix:** Use one shared token.
- **Effort:** S

#### [UX-003] CTA ring offsets use unshared magic numbers
- **Severity:** Low
- **Confidence:** INFERRED
- **Where:** `src/sections/Home/CtaBand.tsx:20-21`
- **Evidence:** Offsets are hard-coded near the CTA rather than derived from nav height tokens.
- **Impact:** Potential decoration drift if nav height changes; not observed as a break in audited viewports.
- **Fix:** Derive from the shared CSS custom property.
- **Effort:** S

### 5.6 Testing (TEST)

#### [TEST-001] No committed test script or CI test gate
- **Severity:** Medium
- **Confidence:** VERIFIED
- **Where:** `package.json`
- **Evidence:** Scripts are `dev`, `build`, `preview`, `extract-assets`; no `test` script and no CI workflow found.
- **Impact:** Responsive/menu/carousel behavior can regress unnoticed.
- **Fix:** Add `test:site` and `test:responsive` scripts and run them after build in CI.
- **Effort:** M

### 5.7 Code quality (CQ)

#### [CQ-001] Duplicate `.mm-studio-card` base rules
- **Severity:** Low
- **Confidence:** VERIFIED
- **Where:** `src/styles/template.css:242-267`, `src/styles/template.css:590-601`
- **Evidence:** Two base definitions with different layout, padding, border and interaction behavior.
- **Impact:** Source-order overrides make the intended variant unclear.
- **Fix:** Split into explicit variants or consolidate one canonical base.
- **Effort:** M

#### [CQ-002] Obsolete template navigation selectors remain in CSS
- **Severity:** Low
- **Confidence:** VERIFIED
- **Where:** `src/styles/original.css:75-93,220-229,272-275`, `src/styles/pages.css:3-8,195-196,844-859`
- **Evidence:** `.top`, `.desk-nav` and `.mobile-nav` are styled, but `src/components/layout/Header.tsx:82-93` renders `.mm-nav` / `.mm-nav__links`.
- **Impact:** Dead CSS misleads maintenance.
- **Fix:** Remove after confirming no static HTML emits those classes.
- **Effort:** S

## 6. Cross-cutting themes

1. **State expressed only in CSS is fragile.** The occasion-card hover flip and the duplicate studio-card rules both encode state in selectors rather than a single component contract, which is why visual and accessible state can diverge.
2. **Layout is healthy; asset weight is the bottleneck.** Every measured responsive layout check is clean, but multi-megabyte PNGs and a 525 kB entry chunk are the dominant remaining user-facing performance risk.
3. **Verification exists but is not institutionalized.** The custom CDP scripts are thorough and reproducible, yet they live outside the npm test flow, so future changes are not automatically gated.

## 7. Remediation roadmap

### Immediate (this release)
- None required for responsive correctness.
- Optionally schedule UX-001 because it is a small accessibility fix.

### Near term (next sprint)
- PERF-001: image conversion/compression and responsive variants.
- PERF-002: route/vendor code splitting.
- TEST-001: promote QA scripts into npm scripts and CI.
- UX-001: hover/ARIA state alignment.

### Longer term
- Consolidate duplicated CSS variants and remove obsolete template selectors.
- Replace scattered nav-height literals with a single design-token layer.
- Add Lighthouse or Web Vitals monitoring so performance work is measured continuously rather than inferred from bundle size.

## 8. Changes implemented

See `audit/09-changes.md` for full detail.

- **CHG-001** — Three-card carousel with cross-fade and hidden-card visibility (`src/sections/Collections/CollectionCarousel.tsx`). Verified by `verify-spin-v2.mjs` (all assertions green).
- **CHG-002** — Mobile-menu scroll lock and focus trap (`src/components/layout/Header.tsx`, `src/styles/template.css`). Verified by responsive audit interaction checks.
- **CHG-003** — Touch-target and desktop minimum target sizes (`src/styles/template.css`, `src/sections/CeremonyCorridor/CeremonyComparison.css`). Verified by 105-record responsive audit; touch failures 0; minimum target 24×24px.
- **CHG-004** — Hardened scratch audit harness (`audit/scratch/responsive-audit.mjs`) with animation settling, touch emulation, fresh Chrome profile and interaction assertions. Verified by repeated clean runs.
- **CHG-005** — Generated recon, baseline JSON, screenshots, phase files and this report.

## 9. Coverage and limitations

- **VERIFIED** Build: `npm run build` passed; 418 modules transformed; SEO generation succeeded.
- **VERIFIED** Site QA: `node scripts/verify-site.mjs` passed with 0 network 4xx/5xx and 0 console errors.
- **VERIFIED** Responsive audit: `node audit/scratch/responsive-audit.mjs` passed with 105 records and all error/overflow counts at 0.
- **VERIFIED** Diff hygiene: `git diff --check` produced no whitespace errors, only CRLF conversion warnings.
- **Not covered:** Lighthouse scores, throttled network/CPU profiles, real-device testing, browser matrix beyond Chrome 157, security, database, API and deployment infrastructure.
- **Environment note:** An interim responsive run reported cached-asset 404s from Chrome's reused headless profile. The scratch harness now clears its profile and disables cache; all final runs are clean.
- **Worktree note:** Unrelated concurrent changes existed during the audit and were left intact. The final `npm run build` passed against the resulting current worktree.
