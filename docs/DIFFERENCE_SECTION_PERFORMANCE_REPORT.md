# "The Difference — With & Without Mister Mapillai": performance and behaviour report

Scope: `src/sections/Home/TransformationSection.tsx` and its styles in `src/styles/template.css` (the `.mm-ba*` rules). Nothing else on the page was changed for this section. Layout, copy, filter labels, photograph mappings, panels, divider design, colours and typography are as they were.

## 1. What the section is made of (audit)

* **Animation architecture.** There is no Lenis in this project and no GSAP timeline or scrub tween in this section. One `ScrollTrigger` (created once, inside `gsap.matchMedia`, so it is re-created only when the media query flips) pins `.mm-ba-stage` for `+=140%` of the viewport (`+=80%` on phones). Its progress feeds one normalised value, `progress` (0 = all BEFORE, 1 = all AFTER). `render()` is the only writer of the visuals: it sets one CSS variable `--p` on the frame, which clips the BEFORE layer (`clip-path: inset(0 0 0 var(--p))`) and positions the divider, plus the two tags and the ARIA values. Scroll, drag, keyboard and a filter change all go through that value, and React state is touched only when the ceremony changes (`active`, `shown`), never per frame.
* **Pin spacing.** One `.pin-spacer`, height = stage + pin distance (checked at every viewport: always a single spacer, also after 24 rapid filter switches).
* **Images.** Six BEFORE/AFTER pairs, 12 photographs.

## 2. Causes found and what was done

| # | Symptom | Cause (measured) | Fix |
|---|---|---|---|
| 1 | Stutter and a freeze when a ceremony's AFTER photograph first appears; slow, memory-hungry page; hero competes for bandwidth | The three AFTER photographs (Nichayathartham, Muhurtham, Reception) were switched to the 8K masters (`collections/high_quality_webp/*_8k.webp`: 6144 × 7680, 14.6–17.1 MB each, lossless). The comparison frame is at most 440 CSS px wide, but it fetched the full 8K file and decoded it into a ~190 MB bitmap. A pair swap cost one frame gap of **950 ms**; the page fetched **52.8 MB of images before the visitor had scrolled at all**; browser memory was 1166–1391 MB at the top of the page. | The frame shows the existing **lossless 1120 × 1400** rendition of the same 8K file (`…_8k-sm.webp`, 1.3–1.7 MB, same 4:5 crop; 2.5 device px per CSS px at the frame's largest size). New registry keys `nichayathartham-after-view`, `reception-transform-after-view`, `muhurtham-after-view` point at those files; the ceremony data (`afterImage`) and every mapping are unchanged, and the 8K masters stay in the registry for anything that shows them large. |
| 2 | Section's images fetched during the hero | All twelve were warmed 350 ms apart as soon as the hero was ready (~8–9 MB), exactly when the hero's frames need the connection | The chosen pair is fetched and decoded when the section is within two screens (`IntersectionObserver`, `rootMargin: 200% 0`); the other five follow one at a time in idle time, nearest ceremony first (the order is re-centred on each new choice); Save-Data keeps to the chosen pair. The `<img>` elements are native-lazy. A filter chosen before its pair has arrived waits for its own decode inside `select()`, so an empty or half-drawn image is never shown. |
| 3 | Filter row stepped down by 34 px when the pin engaged, and back up when it released | The row's `margin-top` collapsed through the stage while it scrolled and was contained once the stage became `position: fixed` | The gap is now the stage's `padding-top` (34 px, 28 px on phones). Measured: the filter row's top is identical at 0 / 25 / 50 / 75 / 100 % of the pin. |
| 4 | Clicking another ceremony just after the pin ended left it at BEFORE with no way to reveal it, and scrolling back up threw the page about 1,300 px | `alignScroll()` only *held* the new value when the page was past the pinned range (the stage sliding up under the navbar), so scrolling down could never reveal anything, and re-entering the range snapped the scroll position | Past the range, if any of the stage is still on screen, a filter click or a divider drag puts the stage back in its pinned position at the chosen value (a few pixels on screen), so the visitor stays in the section and scrolls on from there. Only a stage that has left the screen holds the value. Reproduced before the fix, verified after, on desktop (mouse) and touch. |
| 5 | The "With Mister Mapillai" badge covered the groom's head | A fixed ~124 px badge on a frame that is `min(100%, 440px, 45.33vh)` wide: 38% of a 326 px frame, while the head starts at 35–37% | The badge is sized from the frame (`cqw` units) and kept in the empty top-left corner of all six photographs, ending at ≤ 32.8% of the frame width at every size. Measured clear of the head by ≥ 2.2% of the frame in all six, at every viewport (text unchanged). |
| 6 | At 1024 × 768 (filter row wraps to two lines) the pinned photograph ran 18 px below the screen | The photograph's size ignored the height of the filter row | The frame width is also limited by the room left below the filter row (`--ba-top`, measured from the real layout and kept current with a `ResizeObserver`); the old limit stays the upper bound, so it only gets smaller where it would be cut off. |
| 7 | Divider flicker/jump at exactly 0 % / 100 % on short ranges | The 1 px inset that keeps the pinned stage from falling out of its range read as 0.2 % on a 512 px range | Values within 2 px of either end read as exactly BEFORE / AFTER. |

Findings that did **not** need a change: the pin distance (140 % of the viewport, 80 % on phones) is what the 0 → 100 % reveal needs and gives a calm pace; the divider follows the scroll with a short eased follow (0.45 s) and never lags behind it; pin start/end are measured from the real layout (`invalidateOnRefresh`, refreshed after load and when the filter-row height changes) and re-measured on resize and orientation change.

## 3. White space

Measured, desktop 1440 × 900: section padding 100 px top and bottom (70 px on phones), the same on every section of the site; pin distance 1,260 px (1.4 viewports) with a single spacer of exactly stage + distance; no duplicate spacers; no extra wrappers. The only blank space the section produced beyond the site's normal 100 px rhythm was (a) the 34 px step (fixed, #3), (b) the dead state after the pin where a filter click could not reach the animation (fixed, #4), and (c) on tall screens the strip below the photograph while it is pinned (e.g. ~200 px at 1080 px high, because the photograph is capped at 440 px wide). (c) was left as designed, since filling it would mean enlarging the photograph, which is a design change.

On phones and tablets (≤ 900 px) the stage is the filter row, the photograph and the two panels stacked (1.2–1.4 screens tall), so while it is pinned the panels are below the fold and appear when the pin releases. That is how the section was built and was not changed.

## 4. Results

### Cost of visiting the section, before and after (Chrome, 1440 × 900; same machine and harness)

Non-hero images fetched (the hero's frames excluded) and the section's behaviour while visiting all six ceremonies:

| | Last commit (small AFTER photos) | 8K AFTER photos, old loading (what the section was) | **Now** |
|---|---|---|---|
| Image data fetched before the visitor scrolls (during the hero) | 9.7 MB | **52.8 MB** | **3.5 MB** |
| Image data on arriving at the section | 9.7 MB | 52.8 MB | 10.4 MB |
| Image data after visiting all six | 11.3 MB | 54.3 MB | 12.0 MB |
| Worst frame gap while scrolling through the six animations | 183 ms | **950 ms** | **17 ms** |
| Frames longer than 50 ms (of ~900) | 3 | 3 (one is the 950 ms freeze) | **0** |
| Click on a filter until its pair is on screen, worst of six | 40 ms | 121 ms | 64 ms |
| Browser working set at the top of the page / after all six | 826 / 840 MB | **1166 / 859 MB** | 864 / 809 MB |
| Same, on a 105 Mbit/s link (before scrolling) | 9.7 MB | 52.8 MB, memory 1391 MB | 3.5 MB, memory 867 MB |

(The final build also ships the new hero, so the "before scrolling" figures include no hero frames in any column; hero results are in `HERO_FRAME_REPLACEMENT_AND_PERFORMANCE_REPORT.md`.) Memory figures are the whole browser's working set in a headless run and are noisy to ±100 MB; the 8K figures are well outside that.

### Behaviour, real pointer events, 17 viewports

TABS_MATRIX

### Earlier-suite checks that still apply (single trigger, shared progress)

Reset to 0 % on every switch with no stale frame, one pin spacer after 24 rapid switches, drag from 40 % to 70 % then +5 % of scroll gives ~75 %, −10 % gives ~65 %, backward drag, keyboard (arrows, Home, End), drag while not pinned does not move the page, reduced-motion mode, no console errors.

## 5. Remaining issues

* `CeremonyCorridor` (not on the Home page) also takes `afterImage` straight from the registry, so it now gets the 8K files for those three photographs too. It was left alone as outside this section; it would benefit from the same `-view` renditions.
* The hero intro text re-wraps when the web fonts arrive on a slow link (CLS 0.099 at 10 Mbit/s, identical in the previous build). Preloading the two Cormorant weights would remove it; typography was off limits.
* Phones and tablets keep the existing stacked layout, so the two panels are below the fold while pinned.
* Lighthouse was not run (not installed; installing it was outside the brief); CLS, long tasks, frame pacing, network and memory were measured directly in Chrome instead.
