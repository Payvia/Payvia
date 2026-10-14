// Exact arithmetic on Stellar amounts. Values are decimal strings with up to
// seven places; internally they are BigInt counts of stroops (1e-7).

const SCALE = 7;
const UNIT = BigInt(10) ** BigInt(SCALE);

export function toStroops(amount: string): bigint {
  if (!/^\d+(\.\d{1,7})?$/.test(amount)) {
    throw new Error(`Invalid amount: "${amount}"`);
  }
  const [whole, fraction = ""] = amount.split(".");
  return BigInt(whole) * UNIT + BigInt(fraction.padEnd(SCALE, "0"));
}

export function fromStroops(stroops: bigint): string {
  const whole = stroops / UNIT;
  const fraction = (stroops % UNIT).toString().padStart(SCALE, "0");
  const trimmed = fraction.replace(/0+$/, "");
  return trimmed ? `${whole}.${trimmed}` : `${whole}`;
}

export function sumAmounts(amounts: string[]): string {
  return fromStroops(
    amounts.reduce((total, amount) => total + toStroops(amount), BigInt(0)),
  );
}

/** Negative when a < b, zero when equal, positive when a > b. */
export function compareAmounts(a: string, b: string): number {
  const diff = toStroops(a) - toStroops(b);
  return diff === BigInt(0) ? 0 : diff > BigInt(0) ? 1 : -1;
}
