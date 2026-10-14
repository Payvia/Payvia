import { describe, expect, it } from "vitest";
import { qrFileName } from "./qr";

describe("qrFileName", () => {
  it("uses the reference when there is one", () => {
    expect(
      qrFileName({ reference: "INV-00124", payment_id: "PV-2026-00124" }),
    ).toBe("payvia-INV-00124.png");
  });

  it("falls back to the payment id", () => {
    expect(qrFileName({ payment_id: "PV-2026-00124" })).toBe(
      "payvia-PV-2026-00124.png",
    );
    expect(qrFileName({ reference: "///", payment_id: "PV-2026-00124" })).toBe(
      "payvia-PV-2026-00124.png",
    );
  });

  it("strips characters that are unsafe in file names", () => {
    expect(
      qrFileName({ reference: "Order #12 / A", payment_id: "PV-2026-00001" }),
    ).toBe("payvia-Order-12-A.png");
  });
});
