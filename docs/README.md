# PayVia Frontend — Implementation Plan

PayVia lets a merchant create a Stellar payment request, share it as a link or QR code, and see it turn **Paid** once the transaction is verified on-chain. This folder holds the plan for building the frontend.

Sources: the PRD (_PayVia — Stellar Payment Links & QR Payments_) and the 92 screen exports in [ui-design-assets/](../ui-design-assets/).

## Documents

| #   | Document                                                 | What it covers                                                                   |
| --- | -------------------------------------------------------- | -------------------------------------------------------------------------------- |
| 1   | [01-architecture.md](01-architecture.md)                 | Stack, folder structure, routing, data layer, auth, state                        |
| 2   | [02-design-system.md](02-design-system.md)               | Tokens, typography, components, responsive rules, asset pipeline                 |
| 3   | [03-motion.md](03-motion.md)                             | GSAP vs Motion split, every animated moment, performance and accessibility rules |
| 4   | [04-screens.md](04-screens.md)                           | Every design file mapped to a route, state and component                         |
| 5   | [05-stellar-payment-flow.md](05-stellar-payment-flow.md) | Wallet connection, transaction build/sign/submit, verification, status machine   |
| 6   | [06-roadmap.md](06-roadmap.md)                           | Build phases, acceptance criteria, test matrix                                   |

## Stack at a glance

| Concern                       | Choice                                                                                        |
| ----------------------------- | --------------------------------------------------------------------------------------------- |
| Framework                     | Next.js 16 (App Router, Turbopack), React 19, TypeScript strict                               |
| Styling                       | Tailwind CSS v4 (CSS-first `@theme` tokens)                                                   |
| Scroll and timeline animation | GSAP 3 + ScrollTrigger + SplitText via `@gsap/react`, Lenis smooth scroll on the landing page |
| UI and state animation        | Motion (`motion/react`, the successor to `framer-motion`)                                     |
| Server state                  | TanStack Query                                                                                |
| Forms                         | React Hook Form + Zod                                                                         |
| Stellar                       | `@stellar/stellar-sdk`, `@stellar/freighter-api`, `@albedo-link/intent`                       |
| QR                            | `qrcode.react` (SVG for screen, canvas for PNG download)                                      |
| Package manager               | pnpm                                                                                          |

## Assumptions made

These were not stated in the brief. Each one is cheap to change now and expensive later, so please confirm or correct them.

1. **This repo is frontend only.** The PRD's backend (auth, payment request API, on-chain verification, expiry) lives in a separate service. The frontend talks to it through one typed client, with a mock implementation so UI work is not blocked. See [01-architecture.md](01-architecture.md#data-layer).
2. **The backend, not the browser, decides when a payment is Paid.** The frontend submits the transaction and reports the hash; it never marks a payment Paid on its own.
3. **Auth is email and password**, as drawn in the Login and Sign up screens, with the session held in an httpOnly cookie.
4. **Testnet only for the MVP.** Network and USDC issuer come from environment variables so Mainnet is a config change.

## Open questions

| #   | Question                                                                                                                                                               | Why it matters                                                                                                                        | Default if unanswered                                               |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| 1   | Is there a backend yet, and what is its API contract?                                                                                                                  | Decides whether Phase 2 onward runs on mocks or the real API                                                                          | Build against the contract proposed in 01-architecture and mock it  |
| 2   | Which monospace font is used for the dashboard total, payment links and hashes? The main font is confirmed as Instrument Sans; the PDFs do not expose the mono's name. | Affects the dashboard and payment details                                                                                             | Geist Mono                                                          |
| 3   | Can we get the Figma file, or at least SVG exports of the illustrations with layers intact?                                                                            | The lock, clock and login illustrations can only be animated part-by-part if they arrive as layered SVG. From the PDFs they are flat. | Animate them as whole images (float, parallax, mask reveal)         |
| 4   | Is there a tablet design? The PRD asks for one; the assets have only 1440 and 390 widths.                                                                              | Sidebar vs bottom-tab breakpoint                                                                                                      | Derive tablet from desktop with a collapsed icon sidebar            |
| 5   | What does "Open in wallet app" do on mobile? Freighter's extension is desktop only.                                                                                    | The PRD says the customer flow is mobile-first                                                                                        | SEP-7 `web+stellar:pay` deep link, then poll for the payment        |
| 6   | Search bar, notification bell, help icon, Support, Forgot password: in scope?                                                                                          | Drawn in the shell but have no screens                                                                                                | Search filters payments; the rest are visible but inert or link out |

## Gaps found in the design assets

- No tablet layouts.
- `Error : Failed` exists for mobile only.
- `10 Already Paid and Cancelled` includes only the Already paid variant.
- No screens for Forgot password, Support, notifications, or search results.
- No loading or skeleton states.
- Landing page mobile hero headline breaks mid-word ("send / ing"); treated as a design slip, not intent.
