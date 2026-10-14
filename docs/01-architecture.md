# 01 — Architecture

## Versions

Checked against the npm registry on 2026-10-09.

| Package                | Version   |
| ---------------------- | --------- |
| next                   | 16.4      |
| react / react-dom      | 19.3      |
| tailwindcss            | 4.3       |
| gsap                   | 3.15      |
| @gsap/react            | 2.1       |
| motion                 | 14.1      |
| lenis                  | 1.3       |
| @tanstack/react-query  | 5.x       |
| react-hook-form / zod  | 7.x / 4.x |
| @stellar/stellar-sdk   | 17.x      |
| @stellar/freighter-api | 6.x       |
| @albedo-link/intent    | 0.13.x    |
| qrcode.react           | 4.x       |

Notes that affect how code is written:

- **Next.js 16**: `params`, `searchParams`, `cookies()` and `headers()` are async. Request interception lives in `proxy.ts` (renamed from `middleware.ts`). Read the current docs for each API before using it; do not rely on memory for version-specific behaviour.
- **Motion**: import from `motion/react`. The `framer-motion` package name is legacy.
- **GSAP**: all plugins, including SplitText, are free since 3.13. Register plugins once, in a client module.
- **Tailwind v4**: no `tailwind.config.js`. Tokens are declared in CSS with `@theme`.

## Folder structure

```
payvia/
├── docs/
├── ui-design-assets/            # design source, not shipped
├── public/
│   ├── images/                  # landing photography (AVIF/WebP)
│   └── illustrations/           # SVG illustrations
└── src/
    ├── app/
    │   ├── layout.tsx           # fonts, providers, metadata
    │   ├── globals.css          # Tailwind import + @theme tokens
    │   ├── not-found.tsx
    │   ├── global-error.tsx
    │   ├── (marketing)/
    │   │   ├── layout.tsx       # Lenis provider, marketing nav
    │   │   └── page.tsx         # landing page
    │   ├── (auth)/
    │   │   ├── layout.tsx       # split layout with illustration
    │   │   ├── login/page.tsx
    │   │   ├── signup/page.tsx
    │   │   └── setup/page.tsx   # merchant onboarding
    │   ├── (merchant)/
    │   │   ├── layout.tsx       # app shell: sidebar / bottom tabs / top bar
    │   │   ├── error.tsx        # "Error : App shell"
    │   │   ├── dashboard/page.tsx
    │   │   ├── payments/
    │   │   │   ├── page.tsx     # list, search, status filter
    │   │   │   ├── new/page.tsx # create form + generated state
    │   │   │   └── [id]/page.tsx
    │   │   ├── qr/
    │   │   │   ├── page.tsx
    │   │   │   └── [id]/
    │   │   │       ├── page.tsx
    │   │   │       └── print/page.tsx
    │   │   └── settings/page.tsx
    │   ├── pay/
    │   │   └── [id]/
    │   │       ├── page.tsx     # server: fetch request, pick initial state
    │   │       ├── checkout.tsx # client: wallet + payment state machine
    │   │       ├── not-found.tsx
    │   │       └── opengraph-image.tsx
    │   └── api/                 # BFF route handlers (auth cookie, mock API)
    ├── components/
    │   ├── ui/                  # Button, Input, Select, Badge, Sheet, Dialog…
    │   ├── motion/              # Reveal, SplitHeading, Parallax, Magnetic…
    │   ├── marketing/           # landing sections
    │   ├── merchant/            # shell, tables, summary cards, form steps
    │   ├── checkout/            # hero, detail sheet, state panels
    │   └── qr/                  # QRCode, QRActions, PrintCard
    ├── lib/
    │   ├── api/                 # client interface, http impl, mock impl, schemas
    │   ├── stellar/             # network config, asset, tx builder, freighter, sep7
    │   ├── motion/              # gsap registration, eases, durations
    │   ├── format.ts            # amounts, dates, wallet truncation
    │   └── env.ts               # validated env
    ├── hooks/
    └── types/
proxy.ts                         # auth redirect for (merchant) and (auth)
```

Route groups keep three very different shells apart: marketing (scroll-driven, photographic), merchant (dense app shell), and checkout (single-column, state-coloured). Each gets its own layout and loads only its own animation code.

## Routes

| Route                                                                                                          | Access                                     | Rendering                                  |
| -------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------ |
| `/`                                                                                                            | Public                                     | Static                                     |
| `/login`, `/signup`                                                                                            | Public, redirect to dashboard if signed in | Static shell, client form                  |
| `/setup`                                                                                                       | Signed in, setup incomplete                | Dynamic                                    |
| `/dashboard`, `/payments`, `/payments/new`, `/payments/[id]`, `/qr`, `/qr/[id]`, `/qr/[id]/print`, `/settings` | Signed in, setup complete                  | Dynamic, per-merchant                      |
| `/pay/[id]`                                                                                                    | Public                                     | Dynamic server fetch, client state machine |

`/pay/[id]` is the URL encoded in every QR code and the link shared on WhatsApp. It gets `generateMetadata` and an OG image showing merchant, amount and description, so the link preview itself tells the customer what they are paying for.

## Server and client boundaries

- Pages and layouts are Server Components. They fetch initial data and pass plain serialisable props down.
- Anything using GSAP, Motion, a wallet, forms, or the clipboard is a Client Component, kept as a leaf.
- The Stellar SDK and Freighter API are imported only inside the checkout client bundle, loaded on interaction (`Connect Stellar Wallet`) rather than on page load. The payment page must be fast on a phone over mobile data.
- Dates and amounts are formatted with an explicit locale and UTC to avoid hydration mismatches.

## Data layer

One interface, two implementations:

```ts
// src/lib/api/client.ts
interface PayViaApi {
  auth: { login; signup; logout; me };
  merchant: { get; update; uploadLogo; updateWallet };
  payments: { list; get; create; cancel; summary };
  checkout: { getPublic; reportSubmitted; status };
}
```

- `live/client.ts` calls the real backend at `NEXT_PUBLIC_API_URL`; see [Live backend](#live-backend).
- `client.ts` with `mock/` is an in-memory implementation seeded with the data shown in the designs (ABC Digital, INV-00124, and so on), served through `app/api/mock/*` route handlers. Server Components call the same handler in-process instead of over HTTP.
- `NEXT_PUBLIC_PAYVIA_API_MODE=mock|live` selects one.

Every response is parsed with a Zod schema. The payment schema follows section 15 of the PRD:

```ts
type PaymentStatus =
  | "CREATED"
  | "PENDING"
  | "PROCESSING"
  | "PAID"
  | "FAILED"
  | "EXPIRED"
  | "CANCELLED";

interface Payment {
  payment_id: string; // PV-2026-00124
  slug: string; // 8Xk92Lm, used in /pay/[id]
  merchant_id: string;
  amount: string; // decimal string, never a float
  asset: "USDC";
  network: "TESTNET" | "PUBLIC";
  description: string;
  customer_name?: string;
  customer_email?: string;
  reference?: string;
  due_date?: string;
  recipient_wallet: string;
  customer_wallet?: string;
  payment_url: string;
  transaction_hash?: string;
  status: PaymentStatus;
  expires_at?: string;
  created_at: string;
  updated_at: string;
  paid_at?: string;
}
```

Amounts stay as strings end to end. Stellar amounts have seven decimal places and JavaScript floats will corrupt them.

### Live backend

The backend's contract is its OpenAPI document at `<NEXT_PUBLIC_API_URL>/docs`. Its model differs from the one this app was built on, and `lib/api/live/` absorbs the differences so screens use the same types in both modes:

| This app                              | Backend                                                                                                                                                |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `payment_id`, `slug`                  | `id` (a UUID) and `publicId`. Customers only ever see the `publicId`, which is also the transaction memo.                                              |
| One receiving wallet on the merchant  | Wallets are a separate list. The newest one is the receiving wallet. Creating a request with a new address adds that wallet first.                     |
| Name and business name                | One `businessName`, given at sign-up.                                                                                                                  |
| Logo                                  | Not stored. The logo controls are hidden in live mode.                                                                                                 |
| "No expiry"                           | Every request expires; the default is 7 days, and the form says so in live mode.                                                                       |
| `FAILED` status                       | A failed attempt leaves the request `PENDING`. The customer page shows it as failed from the status endpoint's `latestAttempt`; merchant lists do not. |
| List `total`                          | Not sent. One extra one-row request is made only when a filter finds nothing.                                                                          |
| Browser builds and submits to Horizon | The backend builds (`/prepare`) and submits (`/submit`) the transaction. The browser only asks the wallet to sign, and never loads the Stellar SDK.    |

Lists ask for the backend's largest page (100) and are not paginated yet.

What exists only on the backend is behind `features.backend` and hidden in mock mode:

| Area               | Where                                                                                                                                                                                                                         |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Email verification | A banner across the merchant app with Resend, and `/verify-email?token=`. An unverified account cannot create or email a payment link.                                                                                        |
| Password reset     | `/forgot-password` and `/reset-password?token=`. Resetting ends every session.                                                                                                                                                |
| Wallet changes     | Adding or removing a wallet takes the account password: on setup, in Settings, and when a request names a wallet the account has not used before.                                                                             |
| Account            | Settings: payment emails on or off, change password, change email (confirmed at `/confirm-email-change?token=`, a path the contract does not state), devices signed in, sign out everywhere, delete account.                  |
| Requests           | Customer email and a note on the request, Email link, and CSV export of the current search and filter.                                                                                                                        |
| Refunds            | Payment details list what arrived on-chain. An overpayment, or a payment that did not count, can be refunded: prepared by the backend and signed in Freighter by the receiving wallet, or recorded by hash if sent elsewhere. |
| Payment page       | Shows the note and due date, and opens the backend's own SEP-7 link for "Open in wallet app".                                                                                                                                 |

The gateway treats a few routes specially: email-link tokens need no session; a success on sign out everywhere, password reset, email change or account deletion clears the session cookies; a password change stores the new access token it returns; and the CSV export is passed through as text.

The browser calls the backend through `app/api/backend/[...path]` on this app's origin, never directly; see [Auth](#auth).

### Mock endpoints

The mock API's own routes, proposed before the backend existed.

| Method | Path                                          | Purpose                                                      |
| ------ | --------------------------------------------- | ------------------------------------------------------------ |
| POST   | `/auth/signup`, `/auth/login`, `/auth/logout` | Session                                                      |
| GET    | `/me`                                         | Merchant and setup status                                    |
| PATCH  | `/merchant`                                   | Name, logo, receiving wallet                                 |
| GET    | `/payments?status=&q=&cursor=`                | History with filter and search                               |
| GET    | `/payments/summary`                           | Total requested, paid, pending, link count, last 7 days      |
| POST   | `/payments`                                   | Create request, returns id, slug, URL                        |
| GET    | `/payments/:id`                               | Details                                                      |
| POST   | `/payments/:id/cancel`                        | Cancel                                                       |
| GET    | `/public/payments/:slug`                      | Customer-safe view                                           |
| POST   | `/public/payments/:slug/submitted`            | `{ transaction_hash, customer_wallet }`, moves to PROCESSING |
| GET    | `/public/payments/:slug/status`               | Polled until terminal                                        |

## Auth

- The session lives in an httpOnly, SameSite=Lax cookie. Client JavaScript never sees it.
- `src/proxy.ts` does a cheap cookie-presence redirect only. Real authorisation happens in the merchant layout, which reads the merchant on the server (`getMerchant()` in `lib/api/server.ts`) inside a Suspense boundary and redirects to `/login` or `/setup`.
- Logging in, signing up, finishing setup and logging out end with a full page load (`window.location.assign`), so no cached data or routes outlive a session change.
- Submit buttons stay disabled until the page is interactive (`SubmitButton`), and forms use `method="post"`, so an early tap can neither bypass validation nor put field values in the URL.
- `/pay/*` is never gated.
- **Live backend.** The backend issues a 15-minute access token and a rotating refresh token in a cookie on its own domain. From this site that would be a third-party cookie, which Safari and private windows drop and which `proxy.ts` could never see. So the browser calls `app/api/backend/*` here, which forwards to the backend and keeps both tokens in first-party httpOnly cookies: the refresh token in the session cookie, the access token in `payvia_access`.
- **Only the browser refreshes.** A refresh token works once, and the backend ends the whole session if one is used twice. When the gateway answers 401, the page refreshes (one at a time per tab, and across tabs with a Web Lock) and repeats the request. The server never refreshes, because a Server Component cannot store the new token. For that reason the merchant is loaded in the browser in live mode (`MerchantProvider`) rather than in the layout on the server.

## State

| Kind                                       | Tool                                                                                                           |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Server data (payments, summary, merchant)  | TanStack Query, hydrated from server-fetched data                                                              |
| Live status (dashboard, details, checkout) | Query polling: 3 s while PROCESSING, 15 s while PENDING, stopped on terminal states and when the tab is hidden |
| Checkout flow                              | One `useReducer` state machine, see [05](05-stellar-payment-flow.md)                                           |
| Forms                                      | React Hook Form + Zod resolver                                                                                 |
| URL state (status tab, search)             | `searchParams`                                                                                                 |

No global store is needed.

## Environment

```
NEXT_PUBLIC_APP_URL=https://payvia.app
NEXT_PUBLIC_API_URL=
NEXT_PUBLIC_PAYVIA_API_MODE=mock
NEXT_PUBLIC_STELLAR_NETWORK=TESTNET
NEXT_PUBLIC_HORIZON_URL=https://horizon-testnet.stellar.org
NEXT_PUBLIC_USDC_ISSUER=            # testnet USDC issuer, confirm with backend
NEXT_PUBLIC_EXPLORER_URL=https://stellar.expert/explorer/testnet
```

Validated at startup in `lib/env.ts`; a missing value fails the build rather than a payment.

## Quality gates

- TypeScript strict, ESLint, Prettier with the Tailwind plugin.
- Vitest for `lib/` (formatting, schemas, transaction builder, state machine).
- Playwright for the three end-to-end journeys in [06-roadmap.md](06-roadmap.md), at 390 and 1440 widths, against the mock API with a stubbed wallet.
- Lighthouse budget on `/pay/[id]` (mobile): LCP under 2.0 s, CLS under 0.05, under 120 kB of JS before wallet interaction.
