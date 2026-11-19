# Phase 6 — Functional & Integration Testing

Coverage: production build, custom Chrome/CDP site QA, custom responsive audit, carousel verifier, and whitespace diff check. No committed unit/integration test suite exists.

## Findings

### [TEST-001] No committed test script or CI test gate
- **Severity:** Medium
- **Confidence:** VERIFIED
- **Where:** `package.json`
- **Evidence:** `package.json` scripts are `dev`, `build`, `preview`, `extract-assets`; there is no `test` script, and no CI workflow was found in recon.
- **Impact:** Responsive/menu/carousel behavior relies on ad-hoc scripts in `scripts/` and `audit/scratch/`, so regressions are not automatically caught.
- **Fix:** Promote the responsive and site QA scripts into committed test entry points (for example `npm run test:site`) and run them in CI after `npm run build`.
- **Effort:** M

## Test runs

### Production build — VERIFIED
Command: `npm run build`

Result: `tsc -b` passed, Vite transformed `418 modules`, built in `3.19s`, and SEO generation reported `SEO pages: 6; sitemap URLs: 5; origin: https://mistermapillai.com`. Warning remains: `Some chunks are larger than 500 kB after minification.`

### Site QA — VERIFIED
Command: `node scripts/verify-site.mjs`

Result: `All comprehensive QA verification steps passed!` with:
- `Desktop overflow check: { scrollWidth: 1425, clientWidth: 1425, hasOverflow: false }`
- Form validation advanced an empty form to `nextStep: 'Your Details'` on valid submission
- `Laptop (1024px)`: `{ hasOverflow: false, navVisible: false }`
- `Tablet (768px)` and `Mobile (390px)`: `{ hasOverflow: false, navHidden: true }`
- `Small mobile (320px)`: `{ hasOverflow: false, lockMonoSize: '38px', menuButton: 'flex' }`
- `prefers-reduced-motion` matched
- `Network 4xx/5xx count: 0`
- `Console errors count: 0`

### Responsive audit — VERIFIED
Command: `node audit/scratch/responsive-audit.mjs`

Final result:
- `records: 105`
- `overflowRecords: 0`
- `offscreenRecords: 0`
- `clippedTextRecords: 0`
- `brokenImageRecords: 0`
- `smallTargetRecords: 35` (strict 44px threshold; 0 targets below 24px; 0 failures on touch or `<=1100px` viewports)
- `exceptions: 0`, `consoleErrors: 0`, `networkErrors: 0`

### Carousel verifier — VERIFIED
Command: `C:\Users\Drago\AppData\Local\Temp\opencode\verify-spin-v2.mjs`

Earlier run was green: `frontOk`, `wrapOk`, `titlesOk`, `backOk`, `rapidOk`, `autoOk`, `dragOk`, `styleOk`, `responsiveOk`, `gapOk`, `visibilityRestOk`, `crossfadeOk`.

### Diff whitespace — VERIFIED
Command: `git diff --check`

Result: no whitespace errors; only CRLF conversion warnings for `README.md`, `audit/responsive-baseline.json`, `audit/scratch/responsive-audit.mjs` and `docs/PROJECT_STRUCTURE.md`.

## Test harness notes

- `node scripts/verify-site.mjs` initially failed with `EADDRINUSE 127.0.0.1:4173` from a stale Vite preview owned by this project; that PID was stopped and the script then passed.
- One responsive rerun initially reported 72 asset 404s and one broken image. The files existed on disk and the static server returned 200 when tested directly; the cause was Chrome's cached headless profile. `audit/scratch/responsive-audit.mjs` now launches Chrome with `--user-data-dir=audit/scratch/chrome-profile`, `--disable-cache`, clears the profile before launch and removes it after exit. Subsequent reruns were clean.
