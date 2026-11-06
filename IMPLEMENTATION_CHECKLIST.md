# Source analysis and implementation checklist

Reference: `C:/Users/Drago/Downloads/mister-mapillai-3d-preview 2.html` (859 lines plus trailing newline). The filename differs from the brief's `(1)` suffix; the local file has the expected full site, assets and all nine journey chapters. Its SHA-256 is recorded in `reference/asset-manifest.json`.

## Source inventory

- Lines 1–353: metadata, seven embedded font faces, exact palette, typography, every layout rule, 900px/520px breakpoints and reduced-motion CSS.
- Lines 354–410: original inline SVG with gradients, lotus, elephants, woven band and lettering.
- Lines 412–562: header, continuous travelling seal, eight sections, consultation form and footer.
- Lines 564–856: 46-image map, nine journey chapters, object transforms and sequential reveals, 60 canvas particles, seal interpolation, six corridor scenes, five styling details, twelve collection looks, five embroidery details, damped scroll scene loop, story transform and form delivery.
- Unused `.proc`/`.pcard` CSS is preserved. There is no process-deck section in the original DOM; it is not invented in the React version.

## Geometry and timing preserved

| Surface | Original rule |
| --- | --- |
| Content/header | 1320px max width; `clamp(16px,4vw,56px)` gutters; 78px header |
| Journey | 1000vh, 100svh sticky stage; perspective 1000px; chapter position `p*8.62-.32` |
| Objects | Desktop `min(1.05,w/1500,h/880)` scale; mobile `min(w/700,h/1150)` and x multiplier .66 |
| Seal/About | 230vh; cubic easing; original start/dock bounds; 360° rotation, sinusoidal X/Z arc |
| Corridor | 780vh; 1100px perspective; camera spacing 1500px desktop / 1100px mobile |
| Head to toe | 340vh; scan `(p-.05)/.85`; original pin coordinates and rotations |
| Collection | 420vh; 1600px perspective; 12 × 30° cards; radius from tangent + .3 card width |
| Devatan | 460vh; 1300px perspective; `(p-.04)/.9` detail progression |
| Story | 100svh, minimum 560px; source scale and vertical interpolation |
| Scroll damping | `1-exp(-dt*9)`; final tolerance .0005 |

## Implementation inventory

- [x] Eight sections in their original order and original footer.
- [x] Exact original stylesheet, content, gradients, frames, spacing and responsive breakpoints.
- [x] 46 losslessly extracted image files and typed image mapping.
- [x] Seven original WOFF2 files and original SVG seal.
- [x] Original header/footer logo lockups and anchor navigation.
- [x] All nine journey chapters with original object positions, captions, backgrounds and progress.
- [x] Messages, chips, swatches, sketches, measurement tape and craft circles.
- [x] Gold canvas particles, integrated into one animation scheduler.
- [x] One continuous travelling seal and About reveals.
- [x] Six corridor arches, floor, walls, depth fades, captions and closing message.
- [x] Head-to-toe scan, original pins and active detail.
- [x] Twelve-item true CSS 3D ring, reflections, brightness and active caption.
- [x] Five embroidery hotspots, active/past cards and original shirt transform.
- [x] Story image and quotation.
- [x] Controlled, accessible form, inline validation and six multi-select ceremonies.
- [x] Configurable WhatsApp URL and clipboard delivery with accurate status.
- [x] Dynamic copyright year, visible focus, semantic buttons and meaningful image alt text.
- [x] Live reduced-motion changes and complete effect/listener/timer/RAF cleanup.
- [x] Scroll geometry caching; no React state updates per scroll frame.

## Verification (completed with Chrome headless CDP)

- [x] Strict TypeScript check and production build (`tsc -b && vite build` succeeded in 2.03s with 0 errors).
- [x] Desktop (1440px), laptop (1024px), tablet (768px), mobile (390px) and small mobile (320px) layouts compared with source.
- [x] All journey (9 chapters), corridor (6 scenes), collection (12 looks) and embroidery (5 hotspots) states checked against source.
- [x] Continuous seal movement, reverse scroll and docking checked (`sealVisibility`, `t`, `aboutC` interpolation).
- [x] Form invalid/valid, checkbox, clipboard and WhatsApp paths checked (`nmErr`, `phErr`, status updates).
- [x] Header/footer anchors, keyboard focus and interactive pins/hotspots checked.
- [x] Reduced motion and resize/orientation changes checked.
- [x] No runtime/console errors, failed asset requests or horizontal overflow (0 errors, 0 warnings, 0 failed assets).

The Browser plugin is not available in this session. Browser QA uses regular Playwright with the installed system browser.

## Final comparison evidence

Tested with Playwright 1.64.1 and installed Chrome at **1440×900, 1280×800, 1024×768, 768×1024, 390×844 and 320×568**. Development comparison used `http://127.0.0.1:5173/` and `/reference/original.html`; the production bundle was separately checked at `http://127.0.0.1:4173/`.

- 88 desktop/mobile state comparisons, 52 further responsive comparisons and six final corridor comparisons.
- All nine journey chapters, six ceremonies plus the ending, twelve collection looks and five embroidery details compared with the original.
- 21 interaction checks passed, including actual clipboard write/read, clipboard denial, WhatsApp URL preparation, multiselect functions, keyboard hotspots, pin clicks, reverse seal travel and live reduced-motion changes.
- All 46 source images decoded; all seven original font faces loaded. All 37 rendered image instances also decoded in the production build at desktop and mobile sizes.
- Production build passed after the final pin fix. No application console errors, runtime exceptions, broken asset requests or horizontal overflow were observed.
- Above-the-fold original/production copy compared directly: no added, removed, renamed or reordered visible text.

| Fidelity point | Final result |
| --- | --- |
| Copy | Original headings, descriptions, navigation, labels and product/ceremony data retained. |
| Typography | Exact font binaries, weights and original CSS; desktop/mobile line breaks match. |
| Palette | Original burgundy, ivory, gold gradients, frames and overlays preserved. |
| Geometry | Original container, header, gutters, section heights, image crops and breakpoints preserved. |
| Motion | Original chapter, corridor, ring, seal and garment interpolation retained. |
| Seal | One continuous SVG element; docking bounds agree within one pixel; reverse scroll correctly clears it. |
| Interactive pins | Fixed Chrome hit-testing with a flat child plane; original image rotation and pin geometry remain. |

Reference and rendered screenshots were inspected with `view_image`, including opening screens, mobile styling, About/seal, small-mobile corridor and the collection ring. The final production screenshots were also inspected. No material visual mismatch remains in the tested states; negligible differences occur in 3D compositing and antialiasing.

Canvas dust was hidden only for pixel comparisons because its random positions differ between runs. Visible particles were separately verified and appear in final production screenshots. Corridor comparisons were repeated after waiting for the damped camera to settle, using actual fractional scroll coordinates. The original reference has a harmless missing-favicon request; the React application uses its seal favicon and has no corresponding error.

WhatsApp opening was intercepted to inspect its encoded message; no external message was sent. The actual clipboard content included every form field and both selected ceremonies. Windows CRLF was normalized only in the verification assertion.

Intentional behavior improvements: accessible pins/hotspots; cancellation of stale caption timers; correct seal reset on reverse scroll; live reduced-motion support, including the story image; one shared scheduler with complete cleanup. The original visible design remains intact.

Temporary Playwright scripts and comparison artifacts are outside the project in `C:/Users/Drago/AppData/Local/Temp/mister-mapillai-qa/`. Browser scope is Chrome with desktop/emulated mobile viewports; physical devices, Safari and Firefox were not tested.

## Image quality and delivery refinement

- [x] Original 440px/full-resolution pairs exposed through responsive `srcset`; all twelve collection images select their larger originals at 390×844 with 3× pixel density.
- [x] Original dimensions generated directly from WebP headers and assigned to images; layout and original aspect ratios preserved.
- [x] Hidden journey backgrounds and pictures deferred until upcoming chapters, with two chapters of lookahead.
- [x] Section imagery loaded before entry; anchor destinations begin preparing on navigation.
- [x] Two concurrent asynchronous decode jobs, with queued current imagery promoted ahead of future assets.
- [x] No new RAF loop, changes to animation formulas, added visible UI or image re-encoding.
- [x] All 46 image SHA-256 hashes still match the original extraction manifest.
- [x] `npm run build` passes after the delivery changes.

Production measurements in Chrome/Playwright at 1440×900 (1×) and 390×844 (3×): initial image requests decreased from **14 / 1,535,386 bytes** to **3 / 704,498 bytes**, approximately **54% less image data**. This includes the hero and upcoming chapters; remaining imagery loads ahead of the visitor's progress.

With networking throttled to 75ms latency and 400,000 bytes/second download, all nine journey image states, six corridor scenes, twelve ring positions, five embroidery details, styling and story were exercised. Every journey image was ready in its tested chapter; all corridor and collection images decoded before section entry. Reduced motion and responsive resizing still work. No application errors, failed requests or horizontal overflow were observed. The smallest embroidery crops are only 143–154×168 pixels in the supplied HTML; no higher-resolution detail was invented.

Before/after screenshots and measurements are in the machine's temporary `mister-mapillai-images` directory. The Browser plugin was unavailable; checks used the installed Chrome browser with Playwright.

## Scroll and rendering optimization — November 2026

This pass supersedes the responsive-thumbnail delivery described above: **all displayed images now use the full original files by default**, including on small displays. All 46 source hashes still match. No image has been resized, compressed, re-encoded or replaced.

### Bottlenecks and changes

- Chrome Performance traces exposed 15,500px corridor floor/wall layers, expensive nested collection filters/reflections, repeated styling layout changes and moving-seal measurements during scroll.
- Kept native scrolling and the single existing RAF controller. No GSAP, ScrollTrigger, Lenis or additional animation loop was introduced. The source damping `1-exp(-dt*9)`, camera distances, rotations, reveals, easing and timings remain.
- Cached geometry and style writes; stopped callbacks for settled/inactive scenes. The seal derives its sticky positions from cached bounds. Progress bars and the styling scan use transforms. Pin/caption updates occur only when their state changes.
- Particles and scene callbacks stop outside active sections. Promotion hints are removed on scene exit. Layout-skipping containment was tested and removed after a fresh direct-navigation screenshot exposed a decoded corridor photo retaining zero layout bounds. Original section/3D layout stays available. Measured scroll intervals had zero DOM rectangle reads.
- With explicit user approval for these two effects, added localized WebGL2 corridor floor/wall and collection renderers. Original corridor arches, shadows, fog and panel remain in CSS, with active-scene caching of arch surfaces. Collection rendering retains all twelve original cards, gradients, crops, reflections, brightness and caption selection.
- Texture uploads use decoded original image elements and full natural dimensions. No lower-resolution texture levels or capped canvas DPR. Actual GPU backing-buffer dimensions are checked because drivers can silently clamp oversized canvases. Unsupported sizes/context loss use the original CSS; failed oversized allocations are remembered and released instead of retried each frame.
- Offscreen framebuffers shrink to one pixel. Texture/program/buffer/listener cleanup supports React Strict Mode's repeated setup. Development Strict Mode accelerated both scenes and repeat visits successfully.
- Corrected mobile preload distance: percentage IntersectionObserver margins depended on viewport width. Lookahead now uses eight measured viewport heights. Upcoming journey chapters outrank distant preloads, which use one loading slot to leave room for imminent imagery. At most two loading/decode jobs run together.

### Production QA

Browser plugin unavailable; used installed Chrome **156.0.8078.80**, Playwright **1.64.1**, native CDP wheel gestures, Performance metrics, PerformanceObservers, compositor layers, timeline traces and garbage collection. Desktop/tablet/mobile viewports were **1440×900 at 1×**, **768×1024 at 2×**, and **390×844 at 3×**.

- [x] Strict TypeScript and production build pass.
- [x] 57 desktop/tablet/mobile state comparisons against the original CSS rendering, including reverse seal travel, footer/header anchors and live reduced motion. No application errors or warnings. Original layout/text match in the compared states; GPU resampling/edge antialiasing differs slightly, with no source-resolution reduction.
- [x] Continuous cold-cache mobile scroll through the complete 28,876px scroll range at 1,200px/s, with **75ms latency / 400,000 bytes/s** networking: **zero detected visible missing images**, all **37/37** image elements loaded. Initial image delivery remains **3 requests / 704,498 bytes**.
- [x] All nine journey chapters, six corridor scenes, twelve collection positions, five embroidery details, styling and story exercised under throttled networking.
- [x] No thumbnail substitutions or repeated image transfers across the tested visits/resizes. Each of the twelve original collection textures uploaded once and was reused.
- [x] Resize/orientation at 320px, 900px, 1024px and 844px landscape verified at actual 3× buffer density. At 3440px/3× the driver cannot supply the requested buffers; full-quality CSS fallback is visible and smaller-view recovery works.
- [x] Actual WebGL context loss during both scenes resumes original CSS rendering and continues to follow scroll. WebGL unavailable is also covered by the CSS comparison pages.
- [x] Three repeated complete passes after garbage collection: **zero added DOM nodes or event listeners**; retained heap changed by about **47–54KB**. No unbounded accumulation was observed in these passes.

### Measured performance and remaining limits

The latest eight-section profile, `delivered.json`, was captured after removing unsafe offscreen layout pruning. The following values are mean animation-frame cadence in the tested Chrome desktop/emulated-device viewports, not a guarantee of physical-device presentation rates. Concurrent machine load caused substantial variability between repeated runs.

| Scene | Desktop FPS | Tablet FPS | Mobile FPS |
| --- | --- | --- | --- |
| Journey / hero | 47.83 | 94.49 | 124.00 |
| About | 132.57 | 123.76 | 128.71 |
| Corridor | 125.85 | 121.29 | 132.49 |
| Styling | 139.24 | 143.46 | 141.68 |
| Collection | 139.22 | 106.71 | 103.45 |
| Devatan | 140.63 | 130.03 | 124.59 |
| Story | 143.80 | 144.15 | 139.94 |
| Consultation | 111.29 | 117.87 | 140.97 |

The initial `before.json` profile measured the corridor at 5.80 / 13.51 / 16.36 FPS and collection at 24.48 / 45.52 / 52.96 FPS for desktop / tablet / mobile. Earlier `final.json` and `verified.json` runs remain historical evidence of variability. In particular, the slower `verified.json` means and its five tablet-hero long tasks (53-88ms) and one mobile-hero long task (50ms) are historical results, not findings from the latest delivered profile.

All **24 scene measurements** in `delivered.json` recorded **zero long tasks**, **zero DOM rectangle reads** and at most **one pending application RAF**. Repeat-pass checks recorded **zero added DOM nodes or event listeners**. Retained heap changes after garbage collection were **52,552 / 71,096 / 79,908 bytes** on desktop / tablet / mobile; these bounded observations do not establish a universal memory guarantee.

**Universal stable 60 FPS is not achieved.** The delivered desktop hero averaged **47.83 FPS**, with a **55.4ms** 95th-percentile frame interval. Frame intervals still vary: the tablet hero's 95th percentile was **27.7ms**, and the mobile collection's was **20.7ms**, despite their mean cadence exceeding 60 FPS. The original hero's filtered 3D composition remains costly. Generic hero promotion hints did not improve repeat measurements consistently and were excluded. No hero animation or visual effect was removed. Source caption/detail swaps still register small layout-shift entries (about 0.009-0.026); section heights and scroll positions remain intact, and no blanket zero-CLS claim is made.

Traces confirm the large corridor planes are gone from the compositor layer tree. Remaining hero work includes GPU presentation and filtered-layer compositing; corridor traces still include native image raster/decoding work. Physical devices, Safari and Firefox remain untested, so stable 60 FPS across those environments is unverified.

Temporary evidence is outside the repository at `C:/Users/Drago/AppData/Local/Temp/mister-mapillai-scroll/`: `before.json`, `final.json`, `verified.json`, `delivered.json`, `fidelity.json`, `gpu-checks.json`, `cold-scroll.json`, before/final timeline traces, and desktop/mobile screenshots. Benchmark, visual comparison and cold-network runs were separate so the tests did not compete with one another for GPU time.
