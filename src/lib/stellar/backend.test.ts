import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/errors";
import type { PublicPayment } from "@/lib/api/schemas";
import { SubmitError } from "./submit-errors";

const prepare = vi.fn();
const submit = vi.fn();
vi.mock("@/lib/api", async () => ({
  ApiError: (await import("@/lib/api/errors")).ApiError,
  api: { checkout: { prepare, submit } },
}));

const { backendRail } = await import("./backend");

const payment = { slug: "8Xk92LmQp4Za" } as PublicPayment;
const SOURCE = "GCAN3W2EZ576FBHFHRRG2UDUSODNSVK67673ZP2OXUEM3PDHQDTBHPWM";
const prepared = (attempt: string, msLeft = 300_000) => ({
  attempt_id: attempt,
  xdr: `xdr-${attempt}`,
  network_passphrase: "Test SDF Network ; September 2015",
  expires_at: new Date(Date.now() + msLeft).toISOString(),
  fee: "0.00002",
});

beforeEach(() => {
  prepare.mockReset();
  submit.mockReset();
});

describe("backendRail", () => {
  it("reviews with the backend's fee and signs the transaction it prepared", async () => {
    prepare.mockResolvedValueOnce(prepared("a1"));
    submit.mockResolvedValueOnce({ status: "PAID", transaction_hash: "h1" });

    expect(await backendRail.preflight(payment, SOURCE)).toEqual({
      fee: "0.00002",
    });
    expect(await backendRail.build(payment, SOURCE, "0.00002")).toBe("xdr-a1");
    expect(prepare).toHaveBeenCalledTimes(1);

    expect(await backendRail.submit("signed")).toBe("h1");
    expect(submit).toHaveBeenCalledWith("8Xk92LmQp4Za", {
      attempt_id: "a1",
      signed_xdr: "signed",
    });
  });

  it("prepares again when little signing time is left", async () => {
    prepare
      .mockResolvedValueOnce(prepared("old", 30_000))
      .mockResolvedValueOnce(prepared("new"));
    await backendRail.preflight(payment, SOURCE);
    expect(await backendRail.build(payment, SOURCE, "0.00002")).toBe("xdr-new");
  });

  it("turns the backend's refusals into review problems", async () => {
    prepare.mockRejectedValueOnce(
      new ApiError("insufficient_balance", "No", 422),
    );
    expect(await backendRail.preflight(payment, SOURCE)).toMatchObject({
      problem: "insufficient_balance",
    });

    prepare.mockRejectedValueOnce(new ApiError("not_payable", "No", 409));
    await expect(backendRail.preflight(payment, SOURCE)).rejects.toThrow();
  });

  it("fails on a rejected transaction and keeps checking on no verdict", async () => {
    prepare.mockResolvedValue(prepared("a2"));

    await backendRail.build(payment, SOURCE, "0.00002");
    submit.mockRejectedValueOnce(
      new ApiError("tx_failed", "Your wallet does not have enough USDC.", 422),
    );
    const rejected = await backendRail.submit("signed").catch((e) => e);
    expect(rejected).toBeInstanceOf(SubmitError);
    expect(rejected).toMatchObject({
      uncertain: false,
      message: "Your wallet does not have enough USDC.",
    });

    await backendRail.build(payment, SOURCE, "0.00002");
    submit.mockRejectedValueOnce(new ApiError("network_error", "Offline", 0));
    expect(await backendRail.submit("signed").catch((e) => e)).toMatchObject({
      uncertain: true,
    });
  });

  it("never submits the same signed transaction twice", async () => {
    prepare.mockResolvedValueOnce(prepared("a3"));
    submit.mockResolvedValue({ status: "PAID", transaction_hash: "h3" });
    await backendRail.build(payment, SOURCE, "0.00002");
    await backendRail.submit("signed");
    await expect(backendRail.submit("signed")).rejects.toBeInstanceOf(
      SubmitError,
    );
    expect(submit).toHaveBeenCalledTimes(1);
  });
});
