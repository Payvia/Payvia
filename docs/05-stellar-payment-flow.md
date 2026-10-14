# 05 — Stellar Payment Flow

How the frontend takes a customer from an open payment link to a verified payment. Stellar-specific API details below must be checked against the current `@stellar/stellar-sdk` and `@stellar/freighter-api` docs when implemented; both libraries have changed their method signatures across major versions.

## Division of responsibility

| Step (PRD §10)                                                   | Owner                                           |
| ---------------------------------------------------------------- | ----------------------------------------------- |
| 1–3. Generate request, associate merchant wallet, identify asset | Backend                                         |
| 4. Prepare the transaction                                       | Frontend                                        |
| 5. Customer signs                                                | Wallet                                          |
| 6. Submit                                                        | Frontend, to Horizon                            |
| 7. Monitor                                                       | Frontend polls backend; backend watches Horizon |
| 8. Verify                                                        | **Backend only**                                |
| 9. Update status                                                 | Backend; frontend reflects it                   |

The table describes mock mode. Against the live backend, steps 4 and 6 are the backend's as well: the browser sends the customer's address to `/prepare`, has the wallet sign the transaction it gets back, and returns it to `/submit` (`lib/stellar/backend.ts`). The pre-flight checks below are then the backend's, reported as errors from `/prepare`, and the memo is the request's `publicId`.

The browser is untrusted. A customer could submit any transaction hash, so the frontend's report is a hint, and the backend runs every check in PRD §11 (exists, succeeded, network, recipient, asset, amount, reference) before setting PAID.

## Network configuration

`lib/stellar/config.ts`, from environment:

| Setting            | Testnet value                                                                                                                                                        |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Horizon            | `https://horizon-testnet.stellar.org`                                                                                                                                |
| Network passphrase | `Test SDF Network ; September 2015`                                                                                                                                  |
| USDC asset         | Code `USDC`, issuer from `NEXT_PUBLIC_USDC_ISSUER` (the Testnet value is given under "Running a real Testnet payment"; the backend must verify against the same one) |
| Explorer           | `https://stellar.expert/explorer/testnet/tx/{hash}`                                                                                                                  |

## Linking a transaction to a request

Each payment carries the PayVia payment ID as a **text memo** (for example `PV-2026-00124`). Text memos are limited to 28 bytes, so the ID format must stay within that. This is what lets the backend match "correct payment/reference ID", and what distinguishes two requests for the same amount to the same merchant.

## Checkout state machine

One reducer in `app/pay/[id]/checkout.tsx`. The initial state comes from the server-fetched request, so an expired or paid link never flashes the payable UI.

```
                 ┌────────────── not_found / expired / cancelled / already_paid (terminal, from server)
                 │
idle ──► choosing_wallet ──► connecting ──► connected ──► reviewing ──► signing ──► submitting ──► confirming ──► paid
              │                  │                            │            │            │              │
              ▼                  ▼                            ▼            ▼            ▼              ▼
        wallet_missing    connect_rejected              (blocked:       failed       failed         failed
                                                     balance, trustline,
                                                       wrong network)
```

`failed` always carries a reason and offers Try again, which returns to `reviewing` with the wallet still connected.

| State                  | Design | Backend status          |
| ---------------------- | ------ | ----------------------- |
| idle → reviewing       | 01–04  | PENDING                 |
| signing                | 05     | PENDING                 |
| submitting, confirming | 06     | PROCESSING              |
| paid                   | 07     | PAID                    |
| failed                 | 08     | FAILED or still PENDING |

## Step by step

**1. Connect (Freighter).**
Detect the extension. If absent, show _Freighter not installed_ with an install link. Otherwise request access and read the public key. A refusal shows _Connection rejected_. Read the wallet's selected network; if it is not Testnet, block Review with a message to switch.

**1b. Connect (Albedo).**
Albedo is a web wallet, so there is nothing to detect or install and it also works on phones. It asks for the account, and later for the signature, in a window of its own at albedo.link. Closing that window counts as a refusal; if the browser blocks it, the sheet shows _Pop-up blocked_. Albedo has no network setting: each request names the network.

**2. Pre-flight checks.**
Load the customer account from Horizon and check, before showing Approve:

- USDC trustline exists.
- USDC balance covers the amount.
- XLM balance covers the fee above the account's minimum reserve.
- The request is still PENDING and not expired (re-fetch status).

Any failure shows the matching warning in Review and disables Approve. Catching these here avoids a failed on-chain transaction and a confusing wallet error.

**3. Build.**
A single `payment` operation: destination is the merchant's recipient wallet, asset is USDC, amount is the request's amount string. Add the text memo, the base fee from Horizon's fee stats (shown as "Network fee" in Review; the comp shows `0.00001 XLM`), and a time bound of a few minutes so an abandoned signature cannot be submitted later, after the link has expired.

**4. Sign.**
Pass the transaction XDR and the network passphrase to Freighter. UI moves to _Waiting for Wallet Signature_. Cancel in the UI returns to Review. Rejecting in the wallet goes to _Failed: Rejected in wallet_.

**5. Submit.**
Send the signed transaction to Horizon. Immediately after a successful submission, call `POST /public/payments/:slug/submitted` with the hash and customer wallet, so the merchant's dashboard shows Processing.

Horizon error codes map to plain-language reasons:

| Result code              | Message shown                                                                   |
| ------------------------ | ------------------------------------------------------------------------------- |
| `op_underfunded`         | Your wallet does not have enough USDC.                                          |
| `op_src_no_trust`        | Your wallet is not set up to hold USDC.                                         |
| `op_no_trust`            | The merchant's wallet cannot receive USDC yet. Contact the merchant.            |
| `op_no_destination`      | The merchant's wallet was not found on Stellar.                                 |
| `tx_too_late`            | The approval took too long. Please try again.                                   |
| `tx_bad_seq`             | Something changed in your wallet. Please try again.                             |
| timeout or network error | We could not reach Stellar. Your payment may still go through; we are checking. |

On a timeout the UI does **not** show Failed. It moves to `confirming` and polls, because the transaction may have been accepted.

**6. Confirm.**
Poll `GET /public/payments/:slug/status` every 2–3 seconds with backoff. PAID moves to Success. FAILED moves to Failed with the backend's reason. If nothing is terminal after about 60 seconds, the panel says confirmation is taking longer than usual and keeps polling; the customer can safely close the page.

**7. Success.**
Show the receipt with date and transaction ID, linking to the explorer. Offer Download receipt.

## Duplicate and stale protection

- Approve is disabled from the first tap until the flow returns to Review.
- Status is re-fetched before building and again before submitting.
- If the page is reloaded mid-flow, the server-rendered state reflects the backend: PROCESSING resumes at `confirming`, PAID shows _Already paid_.
- A second customer opening a link that is PROCESSING sees a "payment in progress" notice instead of the pay buttons.

## Mobile: "Open in wallet app"

Freighter's browser extension does not exist on phones, and the PRD expects most links to be opened on mobile from WhatsApp. The second option in the wallet sheet handles this with a **SEP-7 payment URI**:

```
web+stellar:pay?destination=G…&amount=150&asset_code=USDC&asset_issuer=G…&memo=PV-2026-00124&memo_type=MEMO_TEXT
```

Tapping it hands the payment to an installed Stellar wallet. PayVia cannot see the signing happen, so the page moves to a waiting state and polls for the backend to detect the payment by memo. This requires the backend to watch the merchant's account for incoming payments, not only to verify hashes it is given. That is open question 5 in the [README](README.md) and should be settled before Phase 4.

If that backend support is out of scope for the MVP, the mobile fallback is to show the QR and link with a note to open it on a desktop browser with Freighter.

## Merchant side

- **Recipient wallet validation**: format and checksum in the form. On Settings and Setup, also check via Horizon that the account exists and has a USDC trustline, and warn if not, since payments to it would fail.
- **Live status**: dashboard, list and details poll while any visible request is PENDING or PROCESSING.
- **Explorer link**: `View on Stellar Explorer` opens the transaction on the configured explorer.

## QR codes

The QR encodes the PayVia URL, `https://payvia.app/pay/{slug}`, never a raw wallet address (PRD §8). Error-correction level M, with a quiet zone, rendered as SVG. Download produces a 1024 px PNG from a canvas render. Share uses the Web Share API with the image and link where available, falling back to copy. WhatsApp uses `https://wa.me/?text=` with a prefilled message containing the merchant, amount and link.

## Testing without a real wallet

- `lib/stellar/wallet.ts` defines the `WalletAdapter` interface (connect, network, sign) and `lib/stellar/rail.ts` the `PaymentRail` interface (pre-flight checks, build, submit). Freighter, Albedo and Horizon are the real implementations.
- In mock mode only, the wallet sheet also offers a **Demo wallet** backed by a simulated network (`lib/stellar/demo.ts`). It lets the whole flow be clicked through and tested with no extension and no funded accounts.
- Adding `?demo=` to a payment URL rehearses a failure: `reject-connect`, `not-installed`, `insufficient`, `no-trustline`, `wrong-network`, `reject-sign`, `slow-sign`, `submit-fail`, `submit-timeout`.
- The adapter interface is also what makes adding Albedo or Stellar Wallets Kit later a contained change, as the PRD anticipates.

## Running a real Testnet payment

The demo merchant and customer in the mock data use the project's Testnet accounts:

| Role     | Account                                                    |
| -------- | ---------------------------------------------------------- |
| Merchant | `GBBHFEFQ25RTX2LKFNF3LQ6QSYF3JYBY6FCIRG4T4DP2Z77KFQU453JN` |
| Customer | `GCHS5QY33LBZA7B2PWCWQED66BDJ5J4L6J5LWZ322DTFNAL4EGDOKMSG` |

As checked on Horizon on 2026-10-10, both exist and hold about 10,000 XLM, but a USDC payment between them would be blocked by the pre-flight checks:

- The merchant account has no USDC trustline.
- The customer account's only USDC trustline is to a `USDC` asset issued by the merchant account itself, with a zero balance. That is a different asset from Circle's Testnet USDC, which is what the app is configured for.

To make a payment work with Circle's Testnet USDC (issuer `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`):

1. Add a trustline to that asset on both accounts.
2. Get Testnet USDC for the customer account from Circle's faucet.
3. Open a payment link in a desktop browser with Freighter set to Testnet and the customer account selected, and choose Freighter.

With the mock API the request still turns Paid without on-chain verification; the transaction itself is real and visible on the explorer.
