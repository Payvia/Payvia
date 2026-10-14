import { compareAmounts, fromStroops, toStroops } from "@/lib/amount";
import type { PublicPayment } from "@/lib/api/schemas";
import { BASE_FEE_STROOPS, stellar, TX_TIMEOUT_SECONDS } from "./config";
import type { Problem } from "./problems";
import { stroopsToXlm, xlmToStroops, type PaymentRail } from "./rail";
import { messageForResultCodes, SubmitError } from "./submit-errors";

// The SDK is large; load it only when a customer reaches the review step.
const loadSdk = () => import("@stellar/stellar-sdk");
type Sdk = Awaited<ReturnType<typeof loadSdk>>;
type Account = Awaited<
  ReturnType<InstanceType<Sdk["Horizon"]["Server"]>["loadAccount"]>
>;

/** Each account entry (trustline, offer, signer…) locks 0.5 XLM. */
const BASE_RESERVE_STROOPS = BigInt(5_000_000);

function isNotFound(error: unknown) {
  const status = (error as { response?: { status?: number } })?.response
    ?.status;
  return status === 404 || (error as Error)?.name === "NotFoundError";
}

function usdcBalance(account: Account, payment: PublicPayment) {
  return account.balances.find(
    (b) =>
      "asset_code" in b &&
      b.asset_code === payment.asset &&
      b.asset_issuer === stellar.usdc.issuer,
  );
}

/** XLM the account can spend after its minimum reserve and open offers. */
function spendableXlm(account: Account): bigint {
  const native = account.balances.find((b) => b.asset_type === "native");
  if (!native) return BigInt(0);
  const entries =
    2 +
    account.subentry_count +
    (account.num_sponsoring ?? 0) -
    (account.num_sponsored ?? 0);
  const reserve = BigInt(entries) * BASE_RESERVE_STROOPS;
  const liabilities =
    "selling_liabilities" in native
      ? toStroops(native.selling_liabilities)
      : BigInt(0);
  return toStroops(native.balance) - reserve - liabilities;
}

async function server(sdk: Sdk) {
  return new sdk.Horizon.Server(stellar.horizonUrl);
}

export const horizonRail: PaymentRail = {
  async preflight(payment, source) {
    const sdk = await loadSdk();
    const horizon = await server(sdk);

    let feeStroops = BASE_FEE_STROOPS;
    try {
      feeStroops = Math.max(await horizon.fetchBaseFee(), BASE_FEE_STROOPS);
    } catch {
      // Fall back to the base fee; the wallet checks below still decide.
    }
    const fee = stroopsToXlm(feeStroops);
    const fail = (problem: Problem) => ({ fee, problem });

    let customer: Account;
    try {
      customer = await horizon.loadAccount(source);
    } catch (error) {
      return fail(isNotFound(error) ? "account_not_found" : "check_failed");
    }

    const balance = usdcBalance(customer, payment);
    if (!balance) return fail("no_trustline");
    const available = fromStroops(
      toStroops(balance.balance) -
        ("selling_liabilities" in balance
          ? toStroops(balance.selling_liabilities)
          : BigInt(0)),
    );
    if (compareAmounts(available, payment.amount) < 0) {
      return fail("insufficient_balance");
    }
    if (spendableXlm(customer) < BigInt(feeStroops)) {
      return fail("insufficient_xlm");
    }

    try {
      const merchant = await horizon.loadAccount(payment.recipient_wallet);
      if (!usdcBalance(merchant, payment)) return fail("merchant_no_trustline");
    } catch (error) {
      return fail(isNotFound(error) ? "merchant_not_found" : "check_failed");
    }

    return { fee };
  },

  async build(payment, source, fee) {
    const sdk = await loadSdk();
    const horizon = await server(sdk);
    const account = await horizon.loadAccount(source);

    return (
      new sdk.TransactionBuilder(account, {
        fee: String(xlmToStroops(fee)),
        networkPassphrase: stellar.passphrase,
      })
        .addOperation(
          sdk.Operation.payment({
            destination: payment.recipient_wallet,
            asset: new sdk.Asset(payment.asset, stellar.usdc.issuer),
            amount: payment.amount,
          }),
        )
        // The memo ties this transaction to the request so the backend can match it.
        .addMemo(sdk.Memo.text(payment.memo))
        .setTimeout(TX_TIMEOUT_SECONDS)
        .build()
        .toXDR()
    );
  },

  async submit(signedXdr) {
    const sdk = await loadSdk();
    const horizon = await server(sdk);
    const transaction = sdk.TransactionBuilder.fromXDR(
      signedXdr,
      stellar.passphrase,
    );
    const hash = Array.from(transaction.hash(), (byte) =>
      byte.toString(16).padStart(2, "0"),
    ).join("");

    try {
      const result = await horizon.submitTransaction(transaction);
      return result.hash ?? hash;
    } catch (error) {
      const response = (
        error as {
          response?: {
            status?: number;
            data?: { extras?: { result_codes?: Record<string, unknown> } };
          };
        }
      ).response;
      const codes = response?.data?.extras?.result_codes;

      if (codes) {
        throw new SubmitError(
          messageForResultCodes(
            codes as Parameters<typeof messageForResultCodes>[0],
          ),
        );
      }
      // No verdict from Stellar (timeout, dropped connection, 5xx): the
      // transaction may still be accepted, so report it and keep checking.
      throw new SubmitError(
        "We could not reach Stellar. Your payment may still go through; we are checking.",
        true,
        hash,
      );
    }
  },
};
