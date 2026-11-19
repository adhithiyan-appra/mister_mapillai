# Phase 1 — Investigation & Architecture

Scope: responsive/frontend audit of the static React application in `E:\appra\mister_mappilai`. Security, database, API and infrastructure were out of scope; no backend or database exists in this repository.

## System overview

- **VERIFIED** Stack: React 19, strict TypeScript 5.9, Vite 7, Tailwind CSS 4, GSAP, Lottie, custom Web Worker canvas renderer. Evidence: `README.md:39-44`, `package.json`, `vite.config.ts:3-7`.
- **VERIFIED** Routing is a custom history router with canonical paths and legacy redirects, not React Router. Evidence: `src/router.tsx:25-40`, `src/router.tsx:57-80`.
- **VERIFIED** Output is a fully static `dist/` site with generated route HTML, robots.txt and sitemap.xml. Evidence: `npm run build` output `SEO pages: 6; sitemap URLs: 5; origin: https://mistermapillai.com`.
- **VERIFIED** Stylesheet import order is fonts → utilities → original → accessibility → performance → pages → template. Evidence: `src/main.tsx:7-13`.
- **VERIFIED** Feature CSS is imported where used: `src/sections/CeremonyCorridor/CeremonyComparison.tsx:3`.
- **VERIFIED** The current `src/styles/` set is `accessibility.css`, `fonts.css`, `index.css`, `original.css`, `pages.css`, `performance.css`, `preload.css`, `template.css`, `utilities.css`. A previously noted `happy-grooms.css` is not present in the current worktree; its assets are still referenced from `src/data/assets/happyGrooms.ts:5-21` and `src/sections/AboutPage/AboutSections.tsx:96,101`.

## Architecture findings

### [ARCH-001] Frontend-only static application with build-time SEO
- **Severity:** Info
- **Confidence:** VERIFIED
- **Where:** `src/router.tsx:25-40`, `scripts/generate-seo.mjs`
- **Evidence:** Client-side routing resolves known paths and redirects legacy paths in `readLocation()`; `npm run build` ends with `SEO pages: 6; sitemap URLs: 5`.
- **Impact:** No server-side auth/data boundary exists to audit. Static hosting must rewrite unknown paths to `index.html` for the client router and 404 page to work.
- **Fix:** None required; document host rewrite requirements during deployment.
- **Effort:** S

### [ARCH-002] Responsive styles are concentrated in a mature global stylesheet
- **Severity:** Info
- **Confidence:** VERIFIED
- **Where:** `src/styles/template.css`, `src/styles/pages.css`, `src/styles/original.css`
- **Evidence:** `template.css` holds the navigation, touch-target and component rules used by the responsive fixes; `pages.css` holds page-level layout and nav offset rules.
- **Impact:** Responsive behavior is centralized and auditable, but global selector specificity requires careful regression testing.
- **Fix:** Continue verifying with `audit/scratch/responsive-audit.mjs` after future CSS edits.
- **Effort:** S

## Coverage / limitations

- Full frontend route and stylesheet inventory.
- No backend, database, auth, analytics or third-party integration was in scope.
- Current worktree contained unrelated concurrent changes during the audit; those changes were left intact.
