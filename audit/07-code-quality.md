# Phase 7 — Code Quality & Architecture Debt

Coverage: static CSS inspection focused on responsive-impactful debt. Broader code-quality review was outside the responsive audit scope.

## Findings

### [CQ-001] Duplicate `.mm-studio-card` base rules
- **Severity:** Low
- **Confidence:** VERIFIED
- **Where:** `src/styles/template.css:242-267`, `src/styles/template.css:590-601`, with page override at `src/styles/template.css:553`
- **Evidence:** `.mm-studio-card` is defined twice with materially different layout, padding, border and interaction rules.
- **Impact:** Later rules override earlier ones by source order, making the intended card variant hard to reason about and increasing regression risk when responsive rules are added.
- **Fix:** Split into explicit variants (for example `.mm-studio-card--info` and `.mm-studio-card--select`) or consolidate one canonical base.
- **Effort:** M

### [CQ-002] Obsolete template navigation selectors remain in CSS
- **Severity:** Low
- **Confidence:** VERIFIED
- **Where:** `src/styles/original.css:75-93,220-229,272-275`, `src/styles/pages.css:3-8,195-196,844-859`
- **Evidence:** Selectors `.top`, `.desk-nav` and `.mobile-nav` are styled, but `src/components/layout/Header.tsx:82-93` renders `.mm-nav` / `.mm-nav__links`.
- **Impact:** Dead CSS increases cascade noise and may mislead future maintainers into editing rules that do not affect the live navigation.
- **Fix:** Remove the obsolete selectors after confirming no static HTML or legacy template still emits those class names.
- **Effort:** S
