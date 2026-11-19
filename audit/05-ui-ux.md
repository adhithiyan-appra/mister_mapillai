# Phase 5 — UI/UX & Accessibility

Coverage: 7 routes × 15 viewport profiles = 105 page/viewport records, plus menu, testimonial, carousel, track-order and booking interaction checks.

## Findings

### [UX-001] Occasion card hover state desynchronizes from React state and ARIA
- **Severity:** Medium
- **Confidence:** VERIFIED
- **Where:** `src/sections/Home/OccasionsSection.tsx:18-24`, `src/styles/template.css:177-178`
- **Evidence:** CSS `@media (hover:hover){.mm-flip:hover .mm-flip__in{transform:rotateY(180deg)}}` flips the visual card on pointer hover, while `flipped` and `aria-pressed` only change on click/keydown at `OccasionsSection.tsx:11,21`.
- **Impact:** On hover-capable devices the visible back face can disagree with `aria-pressed=false` and the accessible name “Show what's included”. Keyboard and screen-reader users receive a different state from pointer users.
- **Fix:** Drive hover presentation from React state as well (pointer-enter/pointer-leave handlers that also update `flipped`/`aria-pressed`), or remove the CSS-only hover flip so visual and announced state stay identical.
- **Effort:** S

### [UX-002] Navigation offset tokens disagree by 4px
- **Severity:** Low
- **Confidence:** VERIFIED
- **Where:** `src/styles/template.css:27`, `src/styles/pages.css:449`, `src/styles/pages.css:455`
- **Evidence:** `--mm-nav-h` is `74px` while page banner rules use `top:78px` and `height:calc(100svh - 78px)`.
- **Impact:** Anchor/banner offsets can be off by 4px; small but visible on short viewports.
- **Fix:** Replace the literal `78px` values with `var(--mm-nav-h)` or set a single shared token to the actual header height.
- **Effort:** S

### [UX-003] CTA ring offsets use unshared magic numbers
- **Severity:** Low
- **Confidence:** INFERRED
- **Where:** `src/sections/Home/CtaBand.tsx:20-21`
- **Evidence:** Ring offsets are hard-coded near the CTA while navigation height is defined separately in CSS tokens.
- **Impact:** If nav height changes, the CTA decoration can drift. This was not measured as a visible break in the audited viewports.
- **Fix:** Derive the offsets from the same CSS custom property used for nav height.
- **Effort:** S

## Verified responsive behavior

- **VERIFIED** Final audit (`audit/responsive-baseline.json`, generated `2026-11-19T12:23:09.332Z`) covered `320x568`, `360x800`, `390x844`, `430x932`, `600x900`, `768x1024`, `900x600`, `1024x768`, `1280x800`, `1440x900`, `1600x900`, `1920x1080`, `1280x800-touch`, `2560x1080` and `390x844-dpr2`.
- **VERIFIED** `overflowRecords: 0`, `offscreenRecords: 0`, `clippedTextRecords: 0`, `brokenImageRecords: 0`, `exceptions: 0`, `consoleErrors: 0`, `networkErrors: 0`.
- **VERIFIED** Touch-capable and `<=1100px` viewports have zero small-target failures. The audit's strict 44px threshold reports 35 page/viewport records (805 individual elements) on five desktop-pointer widths only; all are at least 24×24px, so the previously identified sub-24px target problem is resolved. Minimum measured target size is `24x24`.
- **VERIFIED** Menu interaction: `open: true`, `visibility: "visible"`, `maxHeight: "770px"`, `bodyOverflow: "hidden"`, `bodyInline: ""`, `htmlInline: ""`. Scroll lock and focus restoration were added at `src/components/layout/Header.tsx:15-18,37-78` and `src/styles/template.css:690-691`.
- **VERIFIED** Testimonial interaction: `pressed: true`, `previewVisibility: "visible"`, `previewOpacity: "0"` at audit capture time; no console/network errors.
- **VERIFIED** Carousel interaction advances from `before: 0` to `after: 1` in the final audit run. The separate spin verifier also passed all carousel assertions earlier.
- **VERIFIED** Track order and booking checks at `390x844`: zero overflow, zero offscreen text, zero clipped text, zero broken images, zero small targets; booking advances to `step: "The Occasion"`.

## Screenshots

Baseline screenshots are in `audit/screenshots/` for home, collections, about, contact, track-order, not-found and interaction states at 360, 390, 768, 1024, 1440 and 1920 widths. DOM/CSS measurements in `audit/responsive-baseline.json` are the source of truth; screenshots are visual evidence only.
