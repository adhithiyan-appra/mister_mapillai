# Implemented Changes

All changes below were authorized by the user. Unrelated concurrent worktree changes were not reverted.

## CHG-001 — Carousel shows exactly three cards with cross-fade
- **Files:** `src/sections/Collections/CollectionCarousel.tsx:18-33,77-88`
- **Change:** Added `DEPTH_RATIO`, `SIDE_FADE_START`, `SIDE_FADE_END`, `wrapOffset()` and `cardOpacity()`; per-card `opacity` and `visibility` are written with the transform so hidden cards do not intercept interaction. Preloading covers active `±1`/`±2`.
- **Verified with:** `C:\Users\Drago\AppData\Local\Temp\opencode\verify-spin-v2.mjs` — `frontOk`, `wrapOk`, `titlesOk`, `backOk`, `rapidOk`, `autoOk`, `dragOk`, `styleOk`, `responsiveOk`, `gapOk`, `visibilityRestOk`, `crossfadeOk`.
- **Suspected side effects:** None observed.

## CHG-002 — Mobile menu locks background scroll and traps focus
- **Files:** `src/components/layout/Header.tsx:15-18,37-78`, `src/styles/template.css:690-691`
- **Change:** Added `navRef`, `menuButtonRef`, `closeMenu(restoreFocus)`, `html.mm-menu-open` scroll lock with scroll-position restore, Escape handling, Tab focus trap, desktop breakpoint auto-close and focus restoration to the menu button.
- **Verified with:** `node audit/scratch/responsive-audit.mjs` — `open: true`, `visibility: "visible"`, `maxHeight: "770px"`, `bodyOverflow: "hidden"`, `bodyInline: ""`, `htmlInline: ""`.
- **Suspected side effects:** The menu now uses `position:fixed` on `body` while open; audit confirms underlying scroll position is restored on close.

## CHG-003 — Touch targets and desktop minimum hit areas
- **Files:** `src/styles/template.css:55,112,333-336,651,676,690-705`, `src/sections/CeremonyCorridor/CeremonyComparison.css:311-316,360-370`
- **Change:** Set 44px minimums on touch/coarse viewports for nav links, buttons, footer links, gallery lead links, track samples, dots and ceremony progress controls. Added 24px base heights for desktop nav links, track samples, footer links and lead links. Rebuilt carousel dots as 24×24px hit areas with a visual `::after` dot and maroon active state. Removed the compact-logo scale transform on touch so the logo keeps its 44px hit area. Allowed ceremony progress labels to wrap and removed the 38px button minimum.
- **Verified with:** `node audit/scratch/responsive-audit.mjs` — zero small-target failures on touch and `<=1100px` viewports; minimum measured target size across all records is `24x24`.
- **Suspected side effects:** Desktop dots now have a larger invisible hit area around the same visual dot; no visual regression observed.

## CHG-004 — Responsive audit harness hardened
- **Files:** `audit/scratch/responsive-audit.mjs`
- **Change:** Added finite-animation settling, better element labels, decorative/clipped ancestor exclusions, deferred image handling, CDP touch emulation, interaction checks, fresh Chrome profile, `--disable-cache`, and non-fatal profile cleanup.
- **Verified with:** Repeated `node audit/scratch/responsive-audit.mjs` runs produced identical clean results: `records: 105`, all zero error/overflow counts, `networkErrors: 0`.
- **Suspected side effects:** None; scratch-only change.

## CHG-005 — Audit evidence generated
- **Files:** `audit/responsive-baseline.json`, `audit/screenshots/*`, `audit/00-recon.md`, phase files and `audit/REPORT.md`
- **Change:** Generated recon, responsive baseline, screenshots and the evidence-backed report.
- **Verified with:** File reads and final checks above.
- **Suspected side effects:** Screenshot files add repository size but are intentional audit artifacts.
