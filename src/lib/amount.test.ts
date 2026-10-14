import { describe, expect, it } from "vitest";
import { compareAmounts, fromStroops, sumAmounts, toStroops } from "./amount";

describe("amount arithmetic", () => {
  it("round-trips through stroops", () => {
    expect(toStroops("150")).toBe(BigInt(1_500_000_000));
    expect(toStroops("0.0000001")).toBe(BigInt(1));
    expect(fromStroops(toStroops("150.50"))).toBe("150.5");
  });

  it("adds without floating point error", () => {
    expect(sumAmounts(["0.1", "0.2"])).toBe("0.3");
    expect(sumAmounts([])).toBe("0");
  });

  it("compares numerically, not as strings", () => {
    expect(compareAmounts("9", "10")).toBeLessThan(0);
    expect(compareAmounts("150.00", "150")).toBe(0);
    expect(compareAmounts("150.0000001", "150")).toBeGreaterThan(0);
  });

  it("rejects malformed input", () => {
    expect(() => toStroops("1.00000001")).toThrow();
    expect(() => toStroops("abc")).toThrow();
  });
});
