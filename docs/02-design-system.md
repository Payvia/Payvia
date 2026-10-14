# 02 — Design System

Values below were sampled from the PDF exports. Treat them as accurate to within a rounding step, and replace them with exact Figma values if the file becomes available.

## Colour

Sampled directly from the comps:

| Token         | Hex                   | Used for                                                 |
| ------------- | --------------------- | -------------------------------------------------------- |
| `brand`       | `#5500FF`             | Checkout hero, primary checkout button, landing CTA band |
| `success`     | `#BBFF00`             | Checkout Paid hero                                       |
| `danger`      | `#FF4000`             | Checkout Failed hero, error icons                        |
| `danger-soft` | `#FFECE6`             | Expired hero, error banners                              |
| `ink`         | `#111111`             | Text, primary merchant buttons                           |
| `surface`     | `#FFFFFF`             | Cards, app background                                    |
| `canvas`      | `#F7F7F7` – `#FAFAFA` | Page background, auth pages, landing cards               |
| `field`       | `#EBEBEB` – `#F2F2F2` | Inputs, active nav item, secondary buttons               |
| `line`        | approx. `#E5E5E5`     | Dividers, card borders                                   |
| `muted`       | approx. `#6B6B6B`     | Secondary text                                           |

Derived tints, to be confirmed against Figma:

| Token        | Approx.   | Used for                                                          |
| ------------ | --------- | ----------------------------------------------------------------- |
| `brand-soft` | `#EDE5FF` | Info banner, Pending and Processing badges, landing eyebrow pills |
| `brand-deep` | `#4400DD` | Leaf shapes in the checkout hero                                  |
| `info-soft`  | `#E0F7FA` | Paid badge and Paid banner in the merchant app                    |

Two things to note:

- **Paid is lime on the customer side and pale cyan on the merchant side.** This is in the designs and is preserved; the status badge component takes its palette from a `context` prop rather than assuming one colour per status.
- **The merchant primary button is black; the checkout primary button is brand purple.** Button variants are `ink`, `brand`, `soft` and `outline`.

Status mapping for the merchant badge:

| Status     | Background    | Text   |
| ---------- | ------------- | ------ |
| Paid       | `info-soft`   | teal   |
| Pending    | `brand-soft`  | brand  |
| Processing | `brand-soft`  | brand  |
| Failed     | `danger-soft` | danger |
| Expired    | `danger-soft` | danger |
| Cancelled  | `danger-soft` | danger |

Colour is never the only signal: every badge carries its label, and payment rows carry a status icon.

## Typography

- **Display and UI**: **Instrument Sans** (Google Fonts, confirmed), set large with tight tracking on the landing page and checkout amount. Loaded as a variable font through `next/font/google`, so every weight comes from one file.
- **Numeric mono**: a monospace face for the dashboard total (`$4,250.00`), the payment-details amount, payment links and transaction hashes. Its name is not confirmed (open question 2); Geist Mono is the stand-in.

Both load with `display: swap` and are exposed as `--font-sans` and `--font-mono`.

| Role            | Desktop      | Mobile    | Notes                                |
| --------------- | ------------ | --------- | ------------------------------------ |
| Landing hero    | 72 / 1.0     | 44 / 1.05 | tracking −0.03em                     |
| Section heading | 44 / 1.05    | 30 / 1.1  | tracking −0.02em                     |
| Checkout amount | 72           | 56        | tabular figures, currency code at 18 |
| Dashboard total | 56 mono      | 40 mono   |                                      |
| Card title      | 20           | 18        |                                      |
| Body            | 14           | 14        |                                      |
| Label, caption  | 12           | 12        |                                      |
| Eyebrow         | 11 uppercase | 11        | tracking +0.04em                     |

Body text is 14 px in the comps. Inputs on mobile are set to 16 px to stop iOS zooming on focus.

## Shape and spacing

- 4 px spacing base.
- Radii: 8 (inputs, small buttons), 12 (cards), 16 (panels), 24–32 (landing hero, CTA band, checkout sheet top corners), full (pills, checkout buttons).
- Cards use a 1 px `line` border and no shadow. Elevation appears only on overlays (menu, dialog, sheet).
- Content widths: merchant content about 880; checkout sheet 440 on desktop and full-bleed on mobile; landing 1360 with 24 px gutters.

## Tailwind setup

Tokens live in `globals.css`:

```css
@import "tailwindcss";

@theme {
  --color-brand: #5500ff;
  --color-brand-soft: #ede5ff;
  --color-success: #bbff00;
  --color-danger: #ff4000;
  --color-danger-soft: #ffece6;
  --color-ink: #111111;
  --color-canvas: #f7f7f7;
  --color-field: #f0f0f0;
  --color-line: #e5e5e5;
  --color-muted: #6b6b6b;

  --font-sans: var(--font-payvia-sans), system-ui, sans-serif;
  --font-mono: var(--font-payvia-mono), ui-monospace, monospace;

  --radius-card: 0.75rem;
  --radius-panel: 1rem;
  --radius-sheet: 2rem;

  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
  --ease-in-out-quart: cubic-bezier(0.76, 0, 0.24, 1);
}
```

The designs are light-mode only. No dark theme is planned.

## Breakpoints

| Name    | Width       | Merchant shell                            | Checkout          | Landing                      |
| ------- | ----------- | ----------------------------------------- | ----------------- | ---------------------------- |
| mobile  | under 768   | Top bar + bottom tab bar                  | Full-bleed sheet  | Single column, stacked cards |
| tablet  | 768 – 1023  | Icon-only sidebar (derived, not designed) | Centred sheet     | Two-column grids             |
| desktop | 1024 and up | 160 px labelled sidebar                   | Centred 440 sheet | As designed at 1440          |

Mobile is built first for `/pay/[id]`; desktop first for the merchant app, then adapted down.

## Components

**Primitives** (`components/ui`): Button, IconButton, Input, Textarea, Select, SegmentedControl, DateField, FileUpload, Badge, Card, Divider, Tabs, Dialog, Sheet, Tooltip, Toast, Skeleton, CopyField, Avatar, EmptyState, ErrorState, ProgressBar.

Dialog, Sheet, Select, Tabs and Tooltip are built on Radix primitives for focus management and keyboard behaviour, styled with Tailwind. The visual language is too specific to adopt a styled kit wholesale.

**Merchant**: AppShell, Sidebar, BottomTabs, TopBar, SummaryList, StatTile, RecentActivity, PaymentRow, PaymentTable, StatusFilter, DetailList, StatusBanner, FormStep (numbered step that turns into a check), RecentRequests, SetupBanner, CancelDialog.

**Checkout**: CheckoutHero (colour and illustration driven by state), MerchantChip, AmountDisplay, DetailSheet, WalletSheet, ProgressPanel, ResultPanel, InfoBanner.

**QR**: QRCode, QRActions (Copy, WhatsApp, Share, Download, Print), QRListItem, PrintCard.

**Marketing**: Nav + MenuPopover, Hero, DeviceMockup, HowItWorks, UseCases, VerificationShowcase, CTABand, Footer.

## Shared formatting

`lib/format.ts` is the single place for:

- Amounts: `150.00 USDC` in detail views, `150 USDC` in lists, `$150.00` + `USDC` in the checkout hero.
- Wallets: `GCFX…7K2M` (first four, last four).
- Hashes: `8e2a9f41…d73c0b6a` (first eight, last eight).
- Dates: `Oct 8` in lists, `Oct 8, 2026 · 10:42 UTC` in details.

## Asset pipeline

The PDFs are the only source today. They embed the raster art at high resolution (up to 4096 px), so it can be extracted with `pdfimages` if nothing better arrives.

| Asset                                        | Source                                       | Target                                                                          |
| -------------------------------------------- | -------------------------------------------- | ------------------------------------------------------------------------------- |
| Landing photography (landscape, tree, coast) | Extract from PDF or get originals            | AVIF + WebP through `next/image`, blur placeholder, `priority` on the hero only |
| Device mockups on the landing page           | **Rebuilt in HTML/CSS** from real components | Sharp at any size and animatable; no screenshots                                |
| Lock, clock, login illustrations             | Layered SVG from Figma preferred             | Inline SVG so parts can be animated                                             |
| Leaf shapes in the checkout hero             | Redrawn as SVG paths                         | Inline, recoloured per state                                                    |
| Icons                                        | Lucide, matched to the comps                 | Tree-shaken imports                                                             |
| Avatar                                       | Placeholder from comps                       | Merchant logo or initials fallback                                              |

Rebuilding the landing mockups in code is deliberate. They show the product's own dashboard and checkout, so reusing the real components keeps them in sync and lets the hero animate the actual UI instead of a picture of it.

## Accessibility baseline

- WCAG 2.2 AA. White on `brand` passes for all text sizes. Dark text is required on `success` lime; the comps already do this.
- Visible focus ring on every interactive element (2 px `brand`, 2 px offset; white ring on brand backgrounds).
- Touch targets at least 44 px on mobile.
- Dialogs and sheets trap focus, close on Escape, and restore focus.
- Status changes in checkout are announced through an `aria-live="polite"` region.
- QR codes have a text alternative and always sit next to the same link in copyable form.
