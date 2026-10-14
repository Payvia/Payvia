import { describe, expect, it } from "vitest";
import {
  formatAmount,
  formatAmountCompact,
  formatAssetAmount,
  formatAssetAmountCompact,
  formatDate,
  formatDateShort,
  formatDateTime,
  formatPaymentUrl,
  truncateHash,
  truncateWallet,
} from "./format";

describe("amounts", () => {
  it("pads to two decimals and groups thousands", () => {
    expect(formatAmount("150")).toBe("150.00");
    expect(formatAmount("4250")).toBe("4,250.00");
    expect(formatAmount("1234567.5")).toBe("1,234,567.50");
  });

  it("keeps significant decimals beyond two without rounding", () => {
    expect(formatAmount("0.1234567")).toBe("0.1234567");
    expect(formatAmount("150.0000000")).toBe("150.00");
  });

  it("does not lose precision on values a float cannot hold", () => {
    expect(formatAmount("9007199254740993.0000001")).toBe(
      "9,007,199,254,740,993.0000001",
    );
  });

  it("drops the decimals in compact form when there are none", () => {
    expect(formatAmountCompact("150.00")).toBe("150");
    expect(formatAmountCompact("150.5")).toBe("150.50");
    expect(formatAmountCompact("0025")).toBe("25");
  });

  it("appends the asset code", () => {
    expect(formatAssetAmount("150", "USDC")).toBe("150.00 USDC");
    expect(formatAssetAmountCompact("150", "USDC")).toBe("150 USDC");
  });

  it("rejects anything that is not a plain decimal", () => {
    expect(() => formatAmount("-5")).toThrow();
    expect(() => formatAmount("1e3")).toThrow();
    expect(() => formatAmount("")).toThrow();
  });
});

describe("truncation", () => {
  it("shortens wallets to four and four", () => {
    expect(
      truncateWallet(
        "GCFXAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA7K2M",
      ),
    ).toBe("GCFX…7K2M");
  });

  it("shortens hashes to eight and eight", () => {
    expect(truncateHash(`8e2a9f41${"0".repeat(48)}d73c0b6a`)).toBe(
      "8e2a9f41…d73c0b6a",
    );
  });

  it("leaves short values alone", () => {
    expect(truncateWallet("GCFX7K2M")).toBe("GCFX7K2M");
  });
});

describe("dates", () => {
  const iso = "2026-10-08T10:42:00Z";

  it("formats in UTC regardless of the local timezone", () => {
    expect(formatDateShort(iso)).toBe("Oct 8");
    expect(formatDate(iso)).toBe("Oct 8, 2026");
    expect(formatDateTime(iso)).toBe("Oct 8, 2026 · 10:42 UTC");
    expect(formatDateShort("2026-10-08T23:59:00-05:00")).toBe("Oct 9");
  });
});

describe("payment url", () => {
  it("strips the protocol", () => {
    expect(formatPaymentUrl("https://payvia.app/pay/8Xk92Lm")).toBe(
      "payvia.app/pay/8Xk92Lm",
    );
  });
});
