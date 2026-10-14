import { Keypair, StrKey } from "@stellar/stellar-sdk";
import { describe, expect, it } from "vitest";
import { isValidPublicKey } from "./strkey";

describe("isValidPublicKey", () => {
  it("accepts real addresses", () => {
    // Circle's USDC issuer on Stellar Testnet.
    expect(
      isValidPublicKey(
        "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
      ),
    ).toBe(true);
  });

  it("agrees with the Stellar SDK on random keys", () => {
    for (let i = 0; i < 25; i++) {
      const address = Keypair.random().publicKey();
      expect(isValidPublicKey(address)).toBe(true);

      // Change one character: the checksum must catch it.
      const swapped = address[20] === "A" ? "B" : "A";
      const typo = address.slice(0, 20) + swapped + address.slice(21);
      expect(isValidPublicKey(typo)).toBe(StrKey.isValidEd25519PublicKey(typo));
      expect(isValidPublicKey(typo)).toBe(false);
    }
  });

  it("rejects the right shape with a wrong checksum", () => {
    expect(isValidPublicKey(`GCFX${"A".repeat(48)}7K2M`)).toBe(false);
  });

  it("rejects secret keys, short input and other junk", () => {
    expect(isValidPublicKey(Keypair.random().secret())).toBe(false);
    expect(isValidPublicKey("GABC")).toBe(false);
    expect(isValidPublicKey("")).toBe(false);
    expect(isValidPublicKey(`g${"a".repeat(55)}`)).toBe(false);
  });
});
