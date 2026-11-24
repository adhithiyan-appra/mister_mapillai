# Hero frame replacement and performance report

Replaces the home-page hero sequence with the frames in `src/assets/animations/hero-frames/new_v1`, converted to genuine lossless WebP, with a slower scroll pace and a loader that fetches only the frames near the scroll position. The hero's design, copy, pinning model and scheduler are unchanged.

## 1. Audit of the new sequence

| | |
|---|---|
| Source folder | `src/assets/animations/hero-frames/new_v1` (not modified) |
| Frames | **202**, `frames00001.png` … `frames00202.png`, contiguous, no gaps, no stray files |
| Format / size | PNG, RGB, **1920 × 1088** for every frame (aspect 1.765), no ICC profile, no orientation tag |
| Source size | 302.2 MiB (316,848,523 bytes) |
| Duplicates | Frames 199–202 are byte-identical (a held end card: the brand logo). They stay in the sequence; the site fetches that one file once. 199 distinct frames. |
| Order | Filenames sort numerically (not alphabetically), and the footage confirms it. A contact sheet of every 8th frame reads as one continuous film: storefront → entering → consultation → kiosk → looks → fabric close-ups → the brand end card. Consecutive-frame differences are small (median 11.6 on a 0–255 scale) except at 37 steps over 30; the largest (33→34, 36→37, 38→39, 41→42, 45→46, 149→150, 171→172 …) fall on shot cuts and the red-and-gold fabric-swirl transitions visible in the sheet, not on misplaced frames. |

The previous sequence (201 lossy WebP frames in `web/`, masters in `source/`) is left on disk but is no longer imported anywhere.

## 2. Lossless WebP conversion

`python scripts/build-hero-frames.py` (Pillow / libwebp; no new dependency) writes `new_v1_webp/frame-0001.webp … frame-0202.webp` and `manifest.json`.

* `lossless=True`, `exact=True`, `method=4` (method 6 produced byte-for-byte the same size on sampled frames and takes ~5× longer).
* Per frame the script refuses to succeed unless: the file is `RIFF…WEBP` with a **`VP8L`** chunk (lossless, not `VP8`), the dimensions equal the source's, and the decoded pixels have **zero difference** from the PNG.
* A separate script (not the build script) re-checked all 202 outputs against the PNGs with NumPy: **202 / 202 pixel-identical, 202 / 202 VP8L**, RIFF sizes consistent, manifest order = file order = source order.

| | PNG | Lossless WebP |
|---|---|---|
| Total | 302.2 MiB | **171.6 MiB (56.8 %)** |
| Per frame (min / mean / max) | | 81 KiB / 870 KiB / 1,594 KiB |
| Emitted into `dist/assets` | | 199 files, 169.8 MiB (the four identical end frames share one file) |

Lossless WebP is smaller than the PNGs, so there was no reason to keep the PNGs as the runtime format. It is, however, **5× the size of the old lossy sequence (33 MiB)**; that cost shapes the loading strategy below and is the main trade-off of this change.

## 3. Code changes

| File | Change |
|---|---|
| `scripts/build-hero-frames.py` | Rewritten: `new_v1` → `new_v1_webp`, lossless, verified, with manifest. |
| `src/sections/Home/heroFrames.ts` | Glob now reads `new_v1_webp/*.webp` (sorted by frame number). Device profile gains `prefetch`, `warm`; decode concurrency scales with cores; slow-link detection (Save-Data, 2G/3G); glide 0.22 → 0.32 s. `engage()` added to the renderer interface. |
| `src/sections/Home/frameRenderer.ts` | `FrameStore` fetches by plan (see §4) instead of downloading everything; per-request cancellation; encoded files dropped when they leave the plan. The WebCodecs decode path was removed (slower on lossless, see §5). Opening frames needed before the loader lifts: 6 → 4. |
| `src/sections/Home/frameRenderer.worker.ts` | New `engage` message. |
| `src/sections/Home/HeroSection.tsx` | Calls `engage()` at the first scroll; exports the frame count and the frame share to CSS so the scroll length follows the frame count. |
| `src/styles/template.css` | Pinned scroll length = frame steps × pace ÷ share of the scroll that plays frames (replaces the fixed `480svh` / `400svh`). |
| `vite.config.ts` | Poster preload now matches `frame-0001-*.webp`. |
| `src/sections/Home/TransformationSection.tsx` | Unrelated to the hero: the divider snaps to exactly 0 % / 100 % within 2 px of the range ends (found by the 320 × 640 test of the previous task). |
| `README.md`, `docs/ASSET_GUIDE.md`, `docs/PROJECT_STRUCTURE.md`, `docs/ANIMATION_GUIDE.md`, `docs/DEVELOPMENT_GUIDE.md` | Updated to the new paths and sizes. |

Not touched: the hero's markup, typography, copy, CTAs, navigation, the shared animation scheduler (the hero runs on it; there is no Lenis, and no second scroll controller was added), the Collections and About animations, the preloader.

## 4. Scroll pace and pinning

The hero is pinned with CSS `position: sticky` inside a tall track; the scroll position selects the frame; frames are drawn only when the displayed frame changes, from a worker onto an `OffscreenCanvas`.

* **Pace.** Scroll per frame step is now a CSS variable: 3.2 svh on desktop, 3 svh up to 1023 px, 2.6 svh up to 640 px. With the intro (12 %) and the held end (5 %) that gives 769 svh of pinned scroll on desktop (was 480) and 625 svh on phones (was 400): about **29 px of scroll per frame at 900 px high** (was 17), roughly 1.7× slower. If the frame count changes, the length follows it; nothing else needs editing.
* **Smoothing.** The playhead glides to the scroll position on the renderer's own clock (0.32 s response, bounded acceleration, never skips a decoded frame); it trails a steadily moving scroll by about a third of a second.
* **End of the sequence.** The last 5 % of the pinned scroll holds the final frame (the logo card) before the next section is released; the next section does not enter the viewport until the pin ends. Scrolling back up reverses frame by frame.

## 5. Loading strategy

Lossless frames average 870 KiB, so the old policy (fetch every frame in the background, keep every encoded file) would have meant a 172 MiB download and 172 MiB of blobs held in memory on every visit. The new policy:

1. **Before any scroll:** the poster (frame 1, preloaded with high priority and decoded before the hero is shown), 3 more opening frames (the loader lifts when these are decoded), then a **warm-up** of 12 frames (6 on phones, none on a slow link or with Save-Data), one request at a time. Measured: **16 requests, 14.5 MiB**.
2. **From the first scroll** (`engage()`, before the playhead has left frame 1): the decoded window (14 frames ahead, 3 behind), the keyframes nearest the playhead, then a **prefetch** of up to 40 encoded frames beyond the window in the direction of travel (24 on phones, 14 on low-power devices, 6 on slow links).
3. **Cancellation and release:** a request the playhead has moved away from is aborted; an encoded file outside the plan is dropped; frames off screen are released (`rest()`); the browser's HTTP cache serves a frame again if the visitor scrolls back.
4. **Decoding:** off the main thread, in the worker, several frames at once (6 on 8+ core machines, 4 otherwise, 2 on low-power), a bounded decoded window, `ImageBitmap.close()` on release, no duplicate decodes. On phones frames are decoded at the drawn size. Image quality is never reduced to save memory.
5. **Decoder choice (measured, Chrome, 12 cores, 1920 × 1088 lossless):** `createImageBitmap(blob)` 27 frames/s on one decode, 69 on four; WebCodecs `ImageDecoder` (which suited the old lossy frames) 13 and 62. The standard decoder is therefore used.

The page needs `Cache-Control: public, max-age=31536000, immutable` on `/assets/*` (the usual setting for a Vite deployment; the repository has no host configuration). Without it every pass through the hero re-downloads the frames it needs.

## 6. Test results

RESULTS_PLACEHOLDER
