# 06 — Roadmap

Six phases. Each ends in something that can be opened in a browser and checked against the designs. The order puts the design system and the mock API first so later phases are assembly, and it puts the landing page last among the build phases because it is the most animation-heavy and the least coupled to everything else.

Phases 3 and 5 can run in parallel if two people are working.

## Phase 0 — Foundation

**Status: done**, except the preview deployment (needs a hosting account). The login, lock and clock illustrations are vector art inside the PDFs and are extracted to SVG when their screens are built.

- Initialise git, Next.js 16 with App Router, TypeScript strict, Tailwind v4, pnpm.
- ESLint, Prettier, Vitest, Playwright, CI running lint, typecheck, tests and build.
- `lib/env.ts`, route groups and empty layouts for marketing, auth, merchant and pay.
- Fonts through `next/font`; `@theme` tokens in `globals.css`.
- GSAP registration module, Motion `LazyMotion` provider, motion tokens.
- Extract and optimise photography and illustrations from the PDFs (or import Figma exports).

**Done when:** the app builds and deploys to a preview URL, every route renders a placeholder inside the right shell, and tokens match the comps side by side.

## Phase 1 — Design system and data layer

**Status: done.** Not yet built, and added when first needed: Tooltip, DateField and FileUpload (Phase 2), Parallax, ImageReveal and Magnetic (Phase 5). Playwright was brought forward into this phase to verify the primitives in a real browser.

- All `components/ui` primitives with their states (default, hover, focus, disabled, error, loading).
- Motion helpers: `Reveal`, `Stagger`, `SplitHeading`, `CountUp`, `PageTransition`.
- A `/dev/components` page (development only) showing every primitive and status badge.
- `PayViaApi` interface, Zod schemas, mock implementation seeded with the design data, TanStack Query setup.
- `lib/format.ts` with unit tests.

**Done when:** every primitive on the dev page matches the comps at 390 and 1440, is keyboard-operable, and the mock API serves all seven payment statuses.

## Phase 2 — Merchant app

**Status: done**, against the mock API. Tablet layouts are derived, not designed. Forgot password and Support open an email to support; notifications show an empty panel.

- Login, Sign up, Setup; session cookie; `proxy.ts` redirects.
- App shell: sidebar, top bar, bottom tabs.
- Dashboard (populated and empty), with the setup banner.
- Create payment request: all five design states, validation, link-generated panel.
- Payments list with search, status tabs, empty and no-results states.
- Payment details for all six statuses, cancel dialog.
- Settings.
- Error boundaries and skeletons.

**Done when:** against the mock API, a merchant can sign up, complete setup, create a request, see it in the list and dashboard, open its details, and cancel it, on both mobile and desktop. Matches PRD milestone "Merchant can create and manage payment requests."

## Phase 3 — QR and sharing

**Status: done**, except two checks that need a real device and a public URL: scanning a printed code with a phone camera, and seeing the preview in WhatsApp. The automated test decodes the downloaded QR image and confirms it holds the PayVia payment URL.

- `QRCode` component; QR in the link-generated panel and payment details.
- QR codes list, QR view, print card with print stylesheet.
- Copy link, Share on WhatsApp, Web Share, Download QR (PNG).
- `/pay/[id]` metadata and OG image.

**Done when:** a downloaded or printed QR scanned with a phone camera opens the right payment page, and a link pasted into WhatsApp shows a preview with merchant and amount.

## Phase 4 — Customer checkout and Stellar

**Status: built and tested against a simulated wallet and network; not yet run with Freighter on Testnet.** Every state in the designs works end to end in mock mode through the demo wallet. What remains needs things outside this repo:

- A real payment: Freighter in a browser, plus funded Testnet accounts with USDC trustlines for the merchant and the customer.
- Real verification: the mock backend marks a payment Paid after a few seconds without looking at the chain.
- "Open in wallet app" opens a SEP-7 link and waits, but nothing confirms the payment until the backend watches the merchant's account for incoming payments.

The lock and clock illustrations are redrawn in code so their parts can move; the people in the designed lock illustration are not included.

- `/pay/[id]` server page and all terminal states (expired, cancelled, already paid, not found).
- Checkout state machine with unit tests for every transition.
- `WalletAdapter`, Freighter implementation, `TestWallet`.
- Pre-flight checks, transaction build, sign, submit, error mapping.
- Status polling; merchant-side live updates.
- Checkout motion: sheet, wallet sheet, illustrations, success and failure transitions.
- Mobile "Open in wallet app" path, per the decision on open question 5.
- Receipt view.

**Done when:** on Stellar Testnet with Freighter, `Create Link → Open Link → Connect Wallet → Pay` completes and the merchant dashboard changes to Paid without a manual refresh. This is the PRD's core deliverable and needs the live backend, or a thin verification stub, to be meaningful.

## Phase 5 — Landing page

**Status: done**, with these differences from the plan in 03-motion.md:

- "How it works" is not pinned. The four cards reveal in sequence with a scroll-driven progress line and a parallax inside each card; pinning was left out to keep scrolling free on a page this short.
- The device mockups are static miniatures built from the same tokens as the product, not the live components.
- The verification section's body copy describes the on-chain checks instead of repeating the "How it works" paragraph, as the design does.
- Frame rate has not been measured on real low-end devices.

- Nav and menu morph, hero with coded device mockups.
- How it works pinned sequence with four live mini-UIs.
- Use cases, verification showcase, CTA band, footer.
- Lenis, ScrollTrigger sequences, reduced-motion and mobile variants.
- SEO metadata, sitemap, robots.

**Done when:** the page matches the comps at both widths, holds its frame-rate budget from [03-motion.md](03-motion.md), and is fully readable with motion disabled and with JavaScript still loading.

## Phase 6 — Hardening and launch

- Run the full test matrix below.
- Accessibility pass: keyboard, screen reader on the checkout flow, contrast, focus order.
- Performance pass against the budgets in [01-architecture.md](01-architecture.md).
- Cross-browser: Chrome, Safari, Firefox, iOS Safari, Android Chrome, and the WhatsApp and Instagram in-app browsers.
- Switch `NEXT_PUBLIC_PAYVIA_API_MODE` to live, deploy, and capture the PRD's demo evidence.

**Done when:** the PRD's final demo runs end to end on the deployed URL.

## Test matrix

From PRD §18, with how each case is exercised.

| Case                                   | How it is tested                                                         | Expected                                                              |
| -------------------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------- |
| Successful payment                     | Playwright with `TestWallet` on Testnet; manual with Freighter           | Success screen; dashboard shows Paid with hash                        |
| Failed payment                         | Mock Horizon failure                                                     | Failed screen with reason; Try again works                            |
| Insufficient balance                   | Customer account with less USDC than the amount                          | Warning in Review; Approve disabled                                   |
| Missing trustline                      | Customer account without USDC trustline                                  | Warning in Review; Approve disabled                                   |
| Incorrect amount                       | Backend rejects a hand-crafted transaction                               | Status stays Pending; customer sees Failed with reason                |
| Incorrect recipient                    | Same, with a different destination                                       | Same                                                                  |
| Expired payment                        | Request with `expires_at` in the past; and expiry while the page is open | Expired screen; no pay buttons; in-flight flow stops before submit    |
| Duplicate payment                      | Double-tap Approve; reload during processing; second visitor             | One transaction only; second visitor sees in-progress or Already paid |
| Wallet disconnect                      | Disconnect in the UI; lock Freighter mid-flow                            | Returns to idle or shows a recoverable error                          |
| Wallet rejects connection or signature | Decline in Freighter                                                     | Connection rejected / Failed: Rejected in wallet                      |
| Freighter not installed                | Browser without the extension                                            | Install prompt                                                        |
| Wrong network                          | Freighter set to Mainnet                                                 | Warning; Approve disabled                                             |
| Cancelled request                      | Merchant cancels while customer has the page open                        | Customer sees cancelled state on next poll                            |
| Mobile experience                      | Real iOS and Android devices, including in-app browsers                  | Layout, sheets and tap targets work; no horizontal scroll             |
| QR scanning                            | Screen and printed card, phone camera                                    | Opens the correct `/pay/[id]`                                         |
| Reduced motion                         | OS setting on                                                            | No pinning, parallax or loops; all content visible                    |
| Slow network                           | 3G throttle on `/pay/[id]`                                               | Amount and merchant visible before JS finishes loading                |

## Demo evidence checklist

From PRD §21.

- [ ] Working PayVia URL
- [ ] Video of payment creation
- [ ] Video of customer checkout
- [ ] Wallet transaction
- [ ] Stellar Testnet transaction hash
- [ ] Merchant dashboard showing Paid
- [ ] QR payment demonstration

## Risks

| Risk                                                     | Effect                                                         | Mitigation                                                                                  |
| -------------------------------------------------------- | -------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| Backend contract unknown or late                         | Phase 4 cannot be proven end to end                            | Mock API from Phase 1; agree the contract in [01-architecture.md](01-architecture.md) early |
| Freighter is desktop-only while the flow is mobile-first | The headline use case (WhatsApp link on a phone) has no wallet | Decide the SEP-7 path before Phase 4                                                        |
| Illustrations arrive flat                                | Lock and clock cannot animate part-by-part                     | Whole-image motion as fallback; request layered SVG now                                     |
| Mono font unconfirmed                                    | Mismatch on amounts, links and hashes                          | Confirm before Phase 1 ends; Geist Mono until then                                          |
| Scroll animation hurts performance on low-end phones     | Poor first impression on the landing page                      | No pinning under 768 px; frame-rate budget enforced in Phase 5                              |
| No tablet designs                                        | Guesswork at 768–1023                                          | Derived layout reviewed by the designer in Phase 2                                          |
