# Template integration: data mapping

The reference template is `mister-mapillai (2).html`. It sets the visual design and interactions.
The existing React application is the source of truth for all content, data and behaviour.

## What the existing application is

- React 19, strict TypeScript and Vite 7. Tailwind utilities are available without preflight.
- A custom History-API router (`src/router.tsx`). The keys of `pageMeta` in `src/data/navigation.ts` define the routes.
- There is **no backend**: no database, API, authentication, admin, orders, payments or customer records.
- All business content is in typed modules under `src/data/`, plus copy inside the existing sections.
- A consultation request opens WhatsApp when `VITE_WHATSAPP_NUMBER` is set. Otherwise it copies the request for Instagram.
- Contact details (`VITE_CONTACT_PHONE`, `_EMAIL`, `_ADDRESS`, `_HOURS`) are optional environment values.

## Section to data mapping

| Template section | Existing source used | Notes |
|---|---|---|
| Navigation and logo | `siteNav`, `fittingHref`, `BrandLogo` | The original logo lockup is kept unchanged. The template's text logo is not used. |
| Hero | `sherwani-wide` image, existing brand copy (`data/brand.ts`) | The template expects a `hero-3d.mp4` that the project does not have. "Since 2014" is not used. |
| Statistics | Counted from `outfits`, `ceremonies` and `embroideryDetails`, plus "made to measure" (journey copy) | The template's figures (1200+ grooms, 12 years, 4.9★) are not verified, so they are not shown. |
| Marquee | `ceremonies[].title` | |
| Occasion flip cards | `ceremonies` (6): image, subtitle, `transformationDetails[].after` | "View the look" opens `/collections?look=<outfitId>`. |
| Before and after slider | `ceremonyTransformations` before/after image pairs and detail rows | Uses real before/after photographs instead of a greyscale copy of one image. |
| Journey timeline | `journeyChapters` (excluding the closing chapter) | |
| Gallery and lightbox | Outfit images plus Mr. Gowtham's story (`happy-grooms-hero`) | Titled "Lookbook": catalogue shots are not presented as customer photographs. |
| Testimonials | `testimonials` | **These records are marked `placeholder: true` in the data, pending customer approval.** |
| CTA band | `/contact` and `contactConfig` (WhatsApp if configured, otherwise Instagram) | |
| 3D carousel | `outfits` | No prices: the existing records have none. Occasion labels take their place. |
| Category filters | `outfitFilters` / `outfitsFor`, `?occasion=` URL parameter (kept) | |
| Product cards and details | `outfits` (title, description, garment, summary, `details` by kind) | Details open in a dialog, which can be linked with `?look=<id>`. |
| Head-to-toe orbit | `stylingDetails` around `ceremonial-shirt` | The same data as the 3D Head-to-Toe scene. |
| Fabric and craft | `happyGroomsMaterials` | The template's claims about Kanchipuram, Banarasi and Italian mills are not used. |
| Brand story and Why/What/How | Existing About copy (`brandIntro`, `brandApproach`, `brandTagline`, `brandPillars`) composed into `brandReasons`; the story lists the six `ceremonies` | The template's company name, city, founding story and years are not verified, so they are not used. The badge counts ceremonies instead of "years of craft". |
| Manufacturing timeline | `journeyChapters`: Design, Motifs, Measure, Craft and Fit | |
| Studio locations | `contactConfig` (address, hours, phone; only the values that are configured) | There are no studio records. The template's three studios are not shown. |
| Booking (4 steps) | `ConsultationValues`, `validateConsultation`, `consultationMessage`, `consultationFunctions`, `outfits` | Same delivery as before (WhatsApp or clipboard for Instagram). Nothing is saved, and no order ID is invented. |
| Order tracking | **No source exists** | The page prepares a status request for the stylist. It does not show a status. |

## Pages

| Route | Contents |
|---|---|
| `/` | Template home, built from the data above |
| `/collections` | Banner, 3D carousel, filtered grid with details, orbit, craft |
| `/about` | **New.** Brand story, pillars, making timeline, studio/contact, CTA |
| `/contact` | Template multi-step booking (the existing booking route) |
| `/track-order` | **New.** Status request form and what happens after booking |
| `/ceremonies` | **New.** The existing 3D Ceremony Corridor and Head-to-Toe scenes, unchanged |

Legacy and template aliases: `/book` and `/order` redirect to `/contact`; `/track` redirects to `/track-order`.

## Missing data and assets

- A hero video (`hero-3d.mp4`).
- Verified statistics: grooms styled, years in business and rating.
- Prices for the looks.
- Studio records: addresses, hours, map links and opening status. Set the `VITE_CONTACT_*` values at minimum.
- Customer-approved testimonials and portraits. Every current record is a placeholder.
- Real customer photographs for a "Real Grooms" gallery.
- An order or booking backend: a booking API, order IDs, statuses and a tracking lookup.
