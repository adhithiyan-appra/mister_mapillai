# Cocktail before and after

The Home page’s Cocktail comparison shows a plain formal shirt and trousers alongside the supplied styled portrait. The Before image is a reference-based edit. It retains the original subject, clasped hands, crossed-leg stance, venue, and 2:3 framing, with minor differences in fine details from generation.

## Image sources and encoding

All four files are in `src/assets/images/collections/looks/before-after/`.

| Side | Original PNG | Live image | Dimensions | WebP bytes |
| --- | --- | --- | --- | ---: |
| Before | `cocktail-before.png` | `cocktail-before.webp` | 1024 × 1536 | 1,222,728 |
| After | `image.png` | `cocktail-after.webp` | 5120 × 7680 | 14,953,348 |

The built-in image editor used the full-resolution After PNG as its reference and returned the Before edit at 1024 × 1536. The approved pair uses both original sizes. Pillow/libwebp encoded each PNG with `lossless=True` and `exact=True`, with no resizing or cropping. The repository’s converter verified the `VP8L` bitstream, dimensions, and exact decoded pixel equality for each WebP against its own PNG.

## Integration

The Home comparison resolves Cocktail to `cocktail-home-before` and `cocktail-home-after` in the image registry. The original shared Cocktail keys still serve the dedicated Ceremonies page, and the other five Home pairs keep their existing sources.

Cocktail loads when selected because the full-resolution After alone transfers 14.95 MB. Both images decode before the visible pair changes. An in-flight selection shares one decode operation for each image, and subsequent selections reuse the hashed image URLs and the section’s readiness state. A load failure leaves the current pair usable and allows a retry.

Once the new pair is ready, the existing filter commit resets the shared comparison progress to 0%. The two 2:3 images fit the existing frame without cropping, and the existing ScrollTrigger, divider, touch and mouse controls continue to use the same comparison progress.

## Verification

- `npm run build` passed.
- Chrome via Playwright verified all six filter mappings at 1440 × 900, 1280 × 720, 768 × 1024, and 390 × 844.
- Selecting Cocktail from a preceding comparison at 100% reset progress to 0%. The divider tracked the shared progress while scrolling forward (25% → 80%) and back (80% → 15%), while dragging with a mouse on desktop and laptop, and while dragging with emulated touch on tablet and phone.
- With the first Cocktail After response held back, the previous photo and its comparison progress stayed visible until the new pair was ready.
- Each fresh browser context transferred each Cocktail asset once and recorded one explicit preload decode per image, including after switching away and back. Both rendered images used their native aspect ratio and `object-fit: contain`.
- Mobile checks used Chrome emulation. Physical-device decode time and memory usage were outside this test run.

## Generation prompt

The built-in editor received `image.png` as its edit target.

> Use case: identity-preserve. Image 1 is the full-resolution edit target and exact registration reference for the Cocktail before/after slider. Produce one photorealistic BEFORE edit on the identical 5120 × 7680 pixel canvas, 2:3 portrait. Change only what the groom is wearing: replace the embroidered long black sherwani and its decorative buttons, gold chain and pocket square with an ordinary plain muted slate-gray long-sleeved formal button-down shirt, tucked into plain dark charcoal trousers, without jacket, ornament, or coordinated luxury accessories. The folded, clasped hands and overlapping fingers must stay precisely in place. Retain his exact face, expression, complexion, hair, beard, head position, shoulders, body proportions, foot placement and crossed-leg stance; match the original warm light, shadows, focus, perspective and framing. Preserve all pixels outside the clothing as closely as possible. The marble floor, columns, walls, white flowers and background highlights should remain registered to the original in the comparison slider. Preserve the original pixel canvas, full figure, identical borders and same position and scale of the subject. No logos, watermarks, text or extra people. Output a single photograph.
