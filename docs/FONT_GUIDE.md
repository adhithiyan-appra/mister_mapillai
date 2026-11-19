# Typography & Font Guide — Mister Mapillai

This guide documents the typography system, self-hosted web fonts, CSS variable hierarchy, and font loading strategy for the **Mister Mapillai** luxury brand.

---

## 1. Typography Hierarchy

Mister Mapillai pairs a classical high-contrast luxury serif with a clean, contemporary sans-serif and an architectural geometric display face:

| Role | Font Family | Fallback Stack | Purpose |
|---|---|---|---|
| **Primary Serif** | `Cormorant Garamond` | `Georgia, serif` | Headings, hero display, ceremony titles, quotes |
| **Secondary Sans** | `Inter` (Variable) | `system-ui, -apple-system, sans-serif` | Body prose, form controls, technical details |
| **Architectural Display** | `Josefin Sans` | `"Futura", "Century Gothic", sans-serif` | Numbers, milestones, uppercase badges, microcopy |
| **Italic Accent** | `Cormorant Garamond Italic` | `Georgia, serif` | Highlighted serif italic accents (`<em>` elements) |

---

## 2. Available Font Files & Variants

All fonts are self-hosted in WOFF2 format under `src/assets/fonts/`:

### Serif Family (`src/assets/fonts/serif/`)
- `cormorant-garamond-300.woff2` (Light, 300)
- `cormorant-garamond-400.woff2` (Regular, 400)
- `cormorant-garamond-400-italic.woff2` (Regular Italic, 400)
- `cormorant-garamond-500.woff2` (Medium, 500)
- `cormorant-garamond-500-italic.woff2` (Medium Italic, 500)
- `cormorant-garamond-600-700.woff2` (SemiBold / Bold, 600–700)

### Sans-Serif Family (`src/assets/fonts/sans-serif/`)
- `inter-variable-latin.woff2` (Variable weight 300–600)
- `josefin-sans-300.woff2` (Light, 300)
- `josefin-sans-400.woff2` (Regular, 400)
- `josefin-sans-600.woff2` (SemiBold, 600)

---

## 3. Centralized CSS Configuration

All `@font-face` rules and typography variables are centralized in `src/styles/fonts.css`:

```css
:root {
  /* Master Font Tokens */
  --font-primary: "Cormorant Garamond", Georgia, serif;
  --font-secondary: "Inter", system-ui, -apple-system, sans-serif;
  --font-display: "Josefin Sans", "Futura", "Century Gothic", sans-serif;
  --font-accent: "Cormorant Garamond", Georgia, serif;

  /* Aliases for template & legacy system compatibility */
  --mm-serif: var(--font-primary);
  --mm-sans: var(--font-secondary);
  --serif: var(--font-primary);
  --sans: var(--font-display);
}
```

---

## 4. Font Loading Strategy

1. **`font-display: swap`**:
   Every `@font-face` declaration uses `font-display: swap` to prevent FOIT (Flash of Invisible Text) and ensure immediate content readability.
2. **Local WOFF2 Serving**:
   Fonts are served directly from the same origin as the application bundle, eliminating external DNS lookups (e.g. to Google Fonts) and ensuring complete offline reliability and privacy compliance.
3. **No Duplicate Declarations**:
   `fonts.css` is imported once in `main.tsx`. Individual page and component styles consume `var(--font-primary)` or `var(--mm-serif)` without re-declaring `@font-face`.

---

## 5. How to Add a New Font

1. Obtain a licensed `.woff2` font file.
2. Place it in `src/assets/fonts/serif/` or `src/assets/fonts/sans-serif/`.
3. Add a new `@font-face` rule in `src/styles/fonts.css` specifying:
   - `font-family`
   - `font-weight`
   - `font-style`
   - `font-display: swap`
   - Relative path to the `.woff2` file: `src: url(../assets/fonts/.../name.woff2) format("woff2");`
4. If it introduces a new design role, define a corresponding CSS variable in the `:root` block of `src/styles/fonts.css`.
5. Run `npm run build` to verify bundling and check that no 404s occur in the network tab.
