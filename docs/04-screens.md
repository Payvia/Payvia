# 04 — Screen Inventory

Every file in [ui-design-assets/](../ui-design-assets/) mapped to where it is built. Each screen has a Desktop (1440) and Mobile (390) export unless noted.

## Landing — `landing-page-ui/`

| Design                       | Route | Sections                                                                                                                  |
| ---------------------------- | ----- | ------------------------------------------------------------------------------------------------------------------------- |
| Landing Page Desktop, Mobile | `/`   | Nav with MENU popover · Hero · How it works (4 cards) · Use cases (4 columns) · Verification showcase · CTA band · Footer |

Copy is taken verbatim from the comps, with two fixes: the "Made for anyone who gets paid and wants to." heading on desktop reads as unfinished and is "Made for anyone who gets paid." on mobile, so the mobile wording is used; and "stellar" is capitalised in "A payment is marked paid only after Stellar confirms it."

Nav links: How it works, Use cases, Verification (in-page anchors), Log in, Get started (to `/signup`).

## Merchant — `merchant-ui/`

### Auth and onboarding

| Design  | Route     | Notes                                                                                                                                                        |
| ------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Login   | `/login`  | Email, password with show/hide, Forgot password link, link to Sign up. Illustration on the right on desktop, hidden on mobile.                               |
| Sign up | `/signup` | Name, email, password (min 8 characters). On success goes to `/setup`.                                                                                       |
| Setup   | `/setup`  | Two steps on one page: merchant name and optional logo; default receiving wallet. `Continue` goes to `/dashboard`. Desktop export is a 664 px card, centred. |

### App shell

Seen in every merchant screen.

- **Sidebar (desktop)**: PayVia wordmark; Dashboard, Create payment request, Payments, QR codes; Support and Settings pinned at the bottom.
- **Top bar**: search field ("Search payments, requests, etc."), help, notifications, avatar menu.
- **Mobile**: compact top bar with icon actions, and a bottom tab bar with the four main destinations.

### Dashboard

| Design                | State        | Notes                                                                                                                                                                                                                 |
| --------------------- | ------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dashboard : Populated | Has payments | Total requested with Testnet tag and asset selector · Create request / View payments · Summary (Paid, Pending, Payment links) · Payments (latest three) · Last 7 days (volume, count) · Recent activity with View all |
| Dashboard : Empty     | No payments  | `$0.00`, zeroed tiles, "No payments yet" with a create button. Also shows the **Add your receiving wallet** banner when setup is incomplete.                                                                          |

Summary rows link to `/payments` with the matching filter.

### Create payment request — `/payments/new`

One page, five numbered steps, with a Recent requests panel on the right (below on mobile).

| Design            | State                                                                                                                                                                                                                              |
| ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Empty             | Steps 1–5 untouched; later fields show "Select asset first." until an asset is chosen                                                                                                                                              |
| Asset dropdown    | Asset select open. USDC · USD Coin is the only MVP option                                                                                                                                                                          |
| Filled            | All steps checked; `Generate payment link` enabled                                                                                                                                                                                 |
| Validation errors | Inline messages under invalid fields; the page grows rather than using a summary box                                                                                                                                               |
| Link generated    | Step 5 becomes **Payment details**: link, asset, amount, reference, info note, QR code, and actions Copy link, Share on WhatsApp, Download QR, Print, View payment page. The new request appears under Recent requests as Pending. |

Fields:

| Field            | Required | Rule                                                                                        |
| ---------------- | -------- | ------------------------------------------------------------------------------------------- |
| Amount           | Yes      | Greater than 0, at most 7 decimal places, shown to 2                                        |
| Expiry           | Yes      | Segmented: No expiry (until paid) or 24 hours (from creation)                               |
| Asset            | Yes      | USDC                                                                                        |
| Description      | Yes      | 1–120 characters                                                                            |
| Reference        | No       | For example INV-00124                                                                       |
| Customer name    | No       |                                                                                             |
| Due date         | No       | Today or later                                                                              |
| Recipient wallet | Yes      | Valid Stellar public key (`G…`, 56 characters, checksum verified). Prefilled from settings. |

The PRD also lists customer email, merchant name, logo and a custom note. Name and logo come from Settings. Customer email and custom note are not in the designs and are left out of the form but kept in the data model.

After generation the form fields are read-only and the page offers a way to create another request.

### Payments

| Design                | Route           | State                                                                                                                                                                   |
| --------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Payments : Populated  | `/payments`     | Search, status tabs (All, Paid, Pending, Expired, Cancelled), Payment history table: request and reference, amount, customer, date, status. Mobile shows stacked cards. |
| Payments : Empty      | `/payments`     | No requests at all                                                                                                                                                      |
| Payments : No results | `/payments?q=…` | Search or filter matched nothing; offers to clear                                                                                                                       |

Processing and Failed rows appear under All; they have no tab of their own in the comps.

### Payment details — `/payments/[id]`

A status banner on top, title and reference, the amount in mono, then a detail list. Side column shows the QR and share actions while the request is still payable.

| Design              | Banner                                      | Differences                                                |
| ------------------- | ------------------------------------------- | ---------------------------------------------------------- |
| Pending             | Waiting for payment.                        | QR and share actions; `Cancel request`                     |
| Processing          | Your payment is being confirmed on Stellar. | Customer wallet and hash appear; no cancel                 |
| Paid                | Payment received successfully.              | Payment date, transaction hash, `View on Stellar Explorer` |
| Failed              | Payment could not be completed.             | Reason; link still payable                                 |
| Expired             | This payment request is no longer active.   | No QR; offer to create a new request                       |
| Cancelled           | Cancelled                                   | No QR                                                      |
| Cancel confirmation | Dialog over Pending                         | Summary of the request; `Keep request` / `Cancel request`  |

Detail rows, in order: Payment link, Asset, Amount, Reference, Description, Customer, Customer wallet, Merchant wallet, Created date, Payment date, Transaction hash. Wallets, link and hash have copy buttons.

### QR codes

| Design               | Route            | Notes                                                                                                                                                                 |
| -------------------- | ---------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| QR codes : Populated | `/qr`            | List of requests with QR thumbnail, title, reference, amount                                                                                                          |
| QR codes : Empty     | `/qr`            | Prompt to create a request                                                                                                                                            |
| QR view              | `/qr/[id]`       | "Scan to Pay" card with title, reference, QR, amount. Actions: View, Download, Share, Print                                                                           |
| QR print card        | `/qr/[id]/print` | Print-optimised card: merchant, Scan to Pay, QR, amount, description, reference, URL, and a one-line instruction. Uses a print stylesheet and opens the print dialog. |

Only payable requests (Pending) are listed by default.

### Settings — `/settings`

Merchant profile (name, logo upload, Save changes) · Receiving wallet (address, Update wallet) · Account (merchant, email, network, Log out).

### Errors

| Design                       | Where it is used                                                                                                                                                   |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Error : App shell            | `(merchant)/error.tsx`. Shell stays; content area shows "Something went wrong" with Retry. Two desktop variants exist (inline and titled); the titled one is used. |
| Error : Full screen          | `global-error.tsx`, when the shell itself cannot render                                                                                                            |
| Error : Invalid link         | `/payments/[id]` or `/qr/[id]` not found                                                                                                                           |
| Error : Expired              | Acting on an expired request                                                                                                                                       |
| Error : Failed (mobile only) | Create or cancel request failed; desktop derived from mobile                                                                                                       |

## Customer — `customer-ui/`

All of these are states of one route, `/pay/[id]`, driven by the state machine in [05-stellar-payment-flow.md](05-stellar-payment-flow.md). The layout is constant: a coloured hero with merchant chip, amount and description, and a white sheet overlapping its lower edge.

| #   | Design                                      | State                       | Hero                                 | Sheet                                                                                                                                                                   |
| --- | ------------------------------------------- | --------------------------- | ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 01  | Payment Page                                | `idle`                      | Brand                                | Payment details (description, reference, recipient, network), QR on desktop, "You'll review everything before approving". Buttons: Connect Stellar Wallet, Scan QR Code |
| 02  | Wallet Connection : Default                 | `choosing_wallet`           | Dimmed                               | Bottom sheet: Freighter (browser extension), Open in wallet app (on your phone)                                                                                         |
| 02  | Wallet Connection : Freighter not installed | `wallet_missing`            | Dimmed                               | Explains and links to install Freighter                                                                                                                                 |
| 02  | Wallet Connection : Connection rejected     | `connect_rejected`          | Dimmed                               | Explains, offers retry                                                                                                                                                  |
| 03  | Wallet Connected                            | `connected`                 | Brand                                | Wallet row with address, copy and Disconnect. Primary becomes Review payment                                                                                            |
| 04  | Review and Approve : Default                | `reviewing`                 | Brand                                | To, Amount, Reference, Network fee, Network. `Approve payment`                                                                                                          |
| 04  | Review and Approve : Insufficient balance   | `reviewing` + blocked       | Brand                                | Warning; Approve disabled                                                                                                                                               |
| 05  | Waiting for Wallet Signature                | `signing`                   | Brand + lock illustration            | "Approve the payment in your wallet", progress, Cancel                                                                                                                  |
| 06  | Processing                                  | `submitting` / `confirming` | Brand + clock illustration           | "Your payment is being confirmed on Stellar."                                                                                                                           |
| 07  | Success                                     | `paid`                      | Lime, chip reads Paid                | Receipt: merchant, amount, reference, date, transaction ID. Download receipt, Close                                                                                     |
| 08  | Failed : Rejected in wallet                 | `failed`                    | Danger, chip reads Payment Failed    | Reason; Try again, Close                                                                                                                                                |
| 09  | Expired                                     | `expired`                   | Soft danger, chip reads Link Expired | "This payment request is no longer active at this time." Contact merchant note                                                                                          |
| 10  | Already Paid                                | `already_paid`              | Lime                                 | Receipt, no actions to pay                                                                                                                                              |
| 11  | Link Not Found                              | `not-found.tsx`             | Brand                                | "We couldn't find this payment request"                                                                                                                                 |

Additions not in the comps but needed:

- **Already cancelled**: same layout as Expired with "This payment request was cancelled."
- **Missing USDC trustline**: a variant of the Insufficient balance warning.
- **Wrong network in wallet**: warning in Review asking the customer to switch Freighter to Testnet.
- **Download receipt**: a print-styled receipt view saved through the browser's print-to-PDF, to avoid shipping a PDF library.

"Scan QR Code" on desktop scrolls to and highlights the QR in the sheet. On mobile, where the customer is already on the phone, it opens the QR in a sheet so another device can scan it.
