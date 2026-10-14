# PayVia

### Simple. Direct. Borderless Payments.

**PayVia** is a blockchain-powered payment platform designed to make sending and receiving digital payments simple, fast, and accessible.

Built on **Stellar**, PayVia explores how stablecoins and blockchain payments can simplify everyday transactions for individuals, businesses, and online communities.


##  What is PayVia?

PayVia provides a simple way for users and businesses to **send, receive, and manage digital payments** without the complexity usually associated with blockchain wallets.

The goal is to make blockchain payments feel as simple as sending money through a familiar payment app.


##  Why PayVia?

Traditional digital payments can involve:

* High transaction costs
* Slow cross-border transfers
* Complex payment processes
* Limited access to global payment infrastructure

PayVia explores how **Stellar and stablecoins** can provide a faster and more accessible alternative.



##  What You Can Do

With PayVia, users can:

*  Send digital payments
*  Receive payments
*  Pay using stablecoins
*  Create payment requests
*  Track transactions
*  Make cross-border payments


##  For Businesses

PayVia can help businesses:

* Accept digital payments
* Generate payment requests
* Track incoming transactions
* Simplify customer payments
* Reduce payment friction
* Reach customers beyond traditional payment networks



##  Built on Stellar

PayVia uses **Stellar** as its payment infrastructure.

This allows us to explore:

**Fast settlement**
**Low transaction costs**
**Stablecoin payments**
**Global accessibility**
**Programmable payment workflows**


##  What We're Building

### 1. Payment Interface

A simple interface for sending and receiving digital payments.

### 2. Payment Requests

Generate payment requests that make it easier for customers or users to pay.

### 3. Transaction Tracking

View payment status and transaction history.

### 4. Stellar Settlement

Demonstrate payment settlement using Stellar assets.



## Project Status

**Prototype / Early Development**

We're currently developing and testing the core payment workflows.

Feedback from early users will help us improve the product and identify the most valuable use cases.


##  Get Involved

We're looking for:

 Developers
 Designers
 Businesses
 Testers
 Product builders
Community members

You can contribute by:

* Testing the prototype
* Sharing feedback
* Suggesting features
* Identifying payment use cases
* Helping with development
* Connecting us with potential users


Discuss payment use cases and integrations.


### PayVia — Payments without the friction.

---

## Development

Payment links and QR payments on Stellar. This repository is the frontend: the landing page, the merchant app, and the customer payment page.

The implementation plan is in [docs/](docs/README.md). Design exports are in [ui-design-assets/](ui-design-assets/).

### Getting started

Requires Node 24 and pnpm 10.

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open http://localhost:3000.

### Deploying to Vercel

`vercel.json` sets the framework to Next.js, so the project builds correctly whatever preset was chosen at import.

Set these environment variables in the Vercel project (Settings → Environment Variables) for Production and Preview. The build fails without them.

| Variable                         | Value                                                                                       |
| -------------------------------- | ------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_APP_URL`            | The site's public URL, for example `https://payvia-sand.vercel.app`                         |
| `NEXT_PUBLIC_PAYVIA_API_MODE`    | `mock`, or `live` to use the backend below                                                  |
| `NEXT_PUBLIC_API_URL`            | Backend origin, required when live: `https://payvia-api.onrender.com`                       |
| `NEXT_PUBLIC_STELLAR_NETWORK`    | `TESTNET`                                                                                   |
| `NEXT_PUBLIC_HORIZON_URL`        | `https://horizon-testnet.stellar.org`                                                       |
| `NEXT_PUBLIC_EXPLORER_URL`       | `https://stellar.expert/explorer/testnet`                                                   |
| `NEXT_PUBLIC_USDC_ISSUER`        | `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`                                  |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` | Optional. Cloudflare Turnstile site key for the sign-up captcha: `0x4AAAAAAFVeZCM-p5vexBaf` |

In mock mode the data lives in the memory of each server instance. On Vercel that means it is not shared between instances and is lost whenever one restarts: the seeded demo account always works, but accounts and requests created on the deployed site can disappear. A real backend removes this limit.

### Scripts

| Command          | What it does                            |
| ---------------- | --------------------------------------- |
| `pnpm dev`       | Start the development server            |
| `pnpm build`     | Production build                        |
| `pnpm start`     | Serve the production build              |
| `pnpm lint`      | ESLint                                  |
| `pnpm typecheck` | Generate route types and run TypeScript |
| `pnpm test`      | Unit tests (Vitest)                     |
| `pnpm format`    | Format with Prettier                    |

### Stack

Next.js 16 (App Router, Cache Components), React 19, TypeScript, Tailwind CSS v4, GSAP, Motion, Lenis, TanStack Query, React Hook Form, Zod.

### Status

Phases 0 to 5 of the [roadmap](docs/06-roadmap.md) are in place: the foundation, the design system, a mock API, the merchant app, QR codes and sharing, the customer payment page with the Stellar flow, and the landing page. Phase 6 (hardening, a real Testnet payment, launch) remains.

The payment flow has been tested against a simulated wallet and network, not yet with Freighter on Testnet; see [docs/05-stellar-payment-flow.md](docs/05-stellar-payment-flow.md) for how to run a real payment. In mock mode the wallet sheet offers a Demo wallet so the flow can be tried without any setup.

### Using the backend

Set `NEXT_PUBLIC_PAYVIA_API_MODE=live` and `NEXT_PUBLIC_API_URL` to the backend's origin; its contract is published at `<origin>/docs`. The browser reaches it through this app (`/api/backend/*`), which keeps the session in first-party cookies, so the backend needs no CORS entry for this site. How the two models are mapped is in [docs/01-architecture.md](docs/01-architecture.md#live-backend).

The backend is at `https://api.getpayvia.app`. Its emails link back to this app, so its `PUBLIC_APP_URL` must be this site's URL: `/verify-email`, `/reset-password` and `/confirm-email-change` are the pages those links open.

Live mode is tested against the published contract and a local stand-in for it, not yet with a real account on the deployed backend. As checked on 2026-10-13, `POST /v1/auth/confirm-email-change` still answers `501 NOT_IMPLEMENTED`, and the contract still lists a 501 for changing email or password, the sessions list, signing out everywhere and deleting the account; the app shows "not available yet" where one comes back.

Every component is shown at `/dev/components` (development and mock-mode builds). The mock API has a demo merchant: `hello@abcdigital.com` / `password123`.
