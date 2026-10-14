import { describe, expect, it } from "vitest";
import { stroopsToXlm, xlmToStroops } from "./rail";
import { sep7PayUri } from "./sep7";
import { GENERIC_SUBMIT_MESSAGE, messageForResultCodes } from "./submit-errors";

describe("fees", () => {
  it("converts between stroops and XLM", () => {
    expect(stroopsToXlm(100)).toBe("0.00001");
    expect(stroopsToXlm(12345)).toBe("0.0012345");
    expect(xlmToStroops("0.00001")).toBe(100);
    expect(xlmToStroops(stroopsToXlm(250))).toBe(250);
  });
});

describe("messageForResultCodes", () => {
  it("prefers the failing operation's reason", () => {
    expect(
      messageForResultCodes({
        transaction: "tx_failed",
        operations: ["op_underfunded"],
      }),
    ).toBe("Your wallet does not have enough USDC.");
    expect(
      messageForResultCodes({
        transaction: "tx_failed",
        operations: ["op_no_trust"],
      }),
    ).toMatch(/merchant's wallet cannot receive USDC/);
  });

  it("falls back to the transaction reason", () => {
    expect(messageForResultCodes({ transaction: "tx_too_late" })).toMatch(
      /took too long/,
    );
    expect(messageForResultCodes({ transaction: "tx_bad_seq" })).toMatch(
      /try again/,
    );
  });

  it("never shows a raw code", () => {
    expect(messageForResultCodes({ transaction: "tx_something_new" })).toBe(
      GENERIC_SUBMIT_MESSAGE,
    );
    expect(messageForResultCodes(undefined)).toBe(GENERIC_SUBMIT_MESSAGE);
  });
});

describe("sep7PayUri", () => {
  it("encodes the request, with the payment id as the memo", () => {
    const uri = sep7PayUri(
      {
        recipient_wallet:
          "GBBHFEFQ25RTX2LKFNF3LQ6QSYF3JYBY6FCIRG4T4DP2Z77KFQU453JN",
        amount: "150",
        asset: "USDC",
        memo: "PV-2026-00124",
      },
      {
        issuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
        passphrase: "Test SDF Network ; September 2015",
      },
    );
    expect(uri.startsWith("web+stellar:pay?")).toBe(true);
    const params = new URLSearchParams(uri.split("?")[1]);
    expect(Object.fromEntries(params)).toEqual({
      destination: "GBBHFEFQ25RTX2LKFNF3LQ6QSYF3JYBY6FCIRG4T4DP2Z77KFQU453JN",
      amount: "150",
      asset_code: "USDC",
      asset_issuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
      memo: "PV-2026-00124",
      memo_type: "MEMO_TEXT",
      network_passphrase: "Test SDF Network ; September 2015",
    });
    expect(uri).not.toContain("+September");
    expect(uri).toContain("%20");
  });

  it("keeps the payment id within Stellar's 28-byte text memo limit", () => {
    expect(
      new TextEncoder().encode("PV-2026-99999").length,
    ).toBeLessThanOrEqual(28);
  });
});
