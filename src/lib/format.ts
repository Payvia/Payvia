// Amounts are decimal strings end to end. Stellar amounts carry seven decimal
// places and must never pass through a JavaScript float.

const AMOUNT_PATTERN = /^\d+(\.\d+)?$/;

function splitAmount(amount: string): [whole: string, fraction: string] {
  if (!AMOUNT_PATTERN.test(amount)) {
    throw new Error(`Invalid amount: "${amount}"`);
  }
  const [whole, fraction = ""] = amount.split(".");
  return [whole.replace(/^0+(?=\d)/, ""), fraction.replace(/0+$/, "")];
}

function group(whole: string) {
  return whole.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/** "150" → "150.00", "4250" → "4,250.00", "0.1234567" → "0.1234567". */
export function formatAmount(amount: string): string {
  const [whole, fraction] = splitAmount(amount);
  return `${group(whole)}.${fraction.padEnd(2, "0")}`;
}

/** List style: "150.00" → "150", "150.5" → "150.50". */
export function formatAmountCompact(amount: string): string {
  const [whole, fraction] = splitAmount(amount);
  return fraction ? `${group(whole)}.${fraction.padEnd(2, "0")}` : group(whole);
}

/** "150.00 USDC" for detail views. */
export function formatAssetAmount(amount: string, asset: string): string {
  return `${formatAmount(amount)} ${asset}`;
}

/** "150 USDC" for lists. */
export function formatAssetAmountCompact(
  amount: string,
  asset: string,
): string {
  return `${formatAmountCompact(amount)} ${asset}`;
}

function truncateMiddle(value: string, head: number, tail: number): string {
  if (value.length <= head + tail + 1) return value;
  return `${value.slice(0, head)}…${value.slice(-tail)}`;
}

/** "GCFX…7K2M" */
export function truncateWallet(address: string): string {
  return truncateMiddle(address, 4, 4);
}

/** "8e2a9f41…d73c0b6a" */
export function truncateHash(hash: string): string {
  return truncateMiddle(hash, 8, 8);
}

// Fixed locale and UTC so server and client render the same string.
const shortDate = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  timeZone: "UTC",
});

const longDate = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
  timeZone: "UTC",
});

const time = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: "UTC",
});

/** "Oct 8" */
export function formatDateShort(iso: string): string {
  return shortDate.format(new Date(iso));
}

/** "Oct 8, 2026" */
export function formatDate(iso: string): string {
  return longDate.format(new Date(iso));
}

/** "Oct 8, 2026 · 10:42 UTC" */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return `${longDate.format(date)} · ${time.format(date)} UTC`;
}

/** "payvia.app/pay/8Xk92Lm" */
export function formatPaymentUrl(url: string): string {
  return url.replace(/^https?:\/\//, "");
}
