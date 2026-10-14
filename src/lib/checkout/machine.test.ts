import { describe, expect, it } from "vitest";
import {
  checkoutReducer,
  initialState,
  resolvePhase,
  type CheckoutEvent,
  type CheckoutState,
} from "./machine";

const ADDRESS = "GCHS5QY33LBZA7B2PWCWQED66BDJ5J4L6J5LWZ322DTFNAL4EGDOKMSG";

const run = (events: CheckoutEvent[], from: CheckoutState = initialState) =>
  events.reduce(checkoutReducer, from);

const connected = run([
  { type: "OPEN_WALLETS" },
  { type: "CONNECT_START", wallet: "freighter" },
  { type: "CONNECTED", wallet: "freighter", address: ADDRESS },
]);
const reviewed = run(
  [{ type: "REVIEW_START" }, { type: "REVIEW_READY", fee: "0.00001" }],
  connected,
);
const confirming = run(
  [{ type: "APPROVE" }, { type: "SIGNED" }, { type: "SUBMITTED", hash: "ab" }],
  reviewed,
);

describe("happy path", () => {
  it("walks from idle to confirming", () => {
    expect(connected).toMatchObject({
      step: "connected",
      wallet: "freighter",
      address: ADDRESS,
      sheet: { open: false },
    });
    expect(reviewed).toMatchObject({
      step: "reviewing",
      checking: false,
      fee: "0.00001",
    });
    expect(confirming).toMatchObject({ step: "confirming", hash: "ab" });
  });
});

describe("wallet connection", () => {
  it("keeps the sheet open with the reason when connecting fails", () => {
    const state = run([
      { type: "OPEN_WALLETS" },
      { type: "CONNECT_START", wallet: "freighter" },
      { type: "CONNECT_FAILED", wallet: "freighter", issue: "not_installed" },
    ]);
    expect(state.step).toBe("idle");
    expect(state.sheet).toEqual({
      open: true,
      issue: "not_installed",
      issueWallet: "freighter",
    });
  });

  it("clears the issue when the sheet is reopened", () => {
    const state = run([
      { type: "CONNECT_FAILED", wallet: "freighter", issue: "rejected" },
      { type: "CLOSE_WALLETS" },
      { type: "OPEN_WALLETS" },
    ]);
    expect(state.sheet).toEqual({ open: true });
  });

  it("disconnects before paying but not during", () => {
    expect(run([{ type: "DISCONNECT" }], connected)).toEqual(initialState);
    expect(run([{ type: "DISCONNECT" }], reviewed)).toEqual(initialState);
    expect(run([{ type: "DISCONNECT" }], confirming)).toBe(confirming);
  });
});

describe("review guards", () => {
  it("cannot approve while checks are running", () => {
    const checking = run([{ type: "REVIEW_START" }], connected);
    expect(run([{ type: "APPROVE" }], checking).step).toBe("reviewing");
  });

  it("cannot approve with a blocking problem", () => {
    const blocked = run(
      [
        { type: "REVIEW_START" },
        {
          type: "REVIEW_READY",
          fee: "0.00001",
          problem: "insufficient_balance",
        },
      ],
      connected,
    );
    expect(run([{ type: "APPROVE" }], blocked).step).toBe("reviewing");
  });

  it("clears the problem when the checks are run again", () => {
    const blocked = run(
      [
        { type: "REVIEW_START" },
        { type: "REVIEW_READY", fee: "0.00001", problem: "no_trustline" },
        { type: "REVIEW_START" },
      ],
      connected,
    );
    expect(blocked).toMatchObject({ checking: true, problem: undefined });
  });
});

describe("duplicate protection", () => {
  it("ignores a second approve once signing has started", () => {
    const signing = run([{ type: "APPROVE" }], reviewed);
    expect(run([{ type: "APPROVE" }], signing)).toBe(signing);
    const submitting = run([{ type: "SIGNED" }], signing);
    expect(run([{ type: "APPROVE" }], submitting)).toBe(submitting);
    expect(run([{ type: "APPROVE" }], confirming)).toBe(confirming);
  });

  it("ignores stale results after the customer cancels signing", () => {
    const cancelled = run(
      [{ type: "APPROVE" }, { type: "SIGN_CANCELLED" }],
      reviewed,
    );
    expect(cancelled.step).toBe("reviewing");
    expect(run([{ type: "SIGNED" }], cancelled).step).toBe("reviewing");
  });
});

describe("failure and retry", () => {
  const failed = run(
    [{ type: "APPROVE" }, { type: "FAIL", reason: "Rejected in wallet." }],
    reviewed,
  );

  it("records the reason", () => {
    expect(failed).toMatchObject({
      step: "failed",
      failure: "Rejected in wallet.",
    });
  });

  it("retries with the wallet still connected, re-running the checks", () => {
    expect(run([{ type: "RETRY" }], failed)).toMatchObject({
      step: "reviewing",
      checking: true,
      address: ADDRESS,
      failure: undefined,
    });
  });

  it("does not fail a payment that is already being confirmed", () => {
    expect(run([{ type: "FAIL", reason: "late" }], confirming)).toBe(
      confirming,
    );
  });
});

describe("wallet app handoff", () => {
  it("waits for the payment and can go back", () => {
    const external = run([
      { type: "OPEN_WALLETS" },
      { type: "EXTERNAL_START" },
    ]);
    expect(external).toMatchObject({
      step: "external",
      sheet: { open: false },
    });
    expect(run([{ type: "EXTERNAL_BACK" }], external)).toEqual(initialState);
  });
});

describe("resolvePhase", () => {
  it("follows local progress while the request is pending", () => {
    expect(resolvePhase(initialState, "PENDING").phase).toBe("idle");
    expect(resolvePhase(reviewed, "PENDING").phase).toBe("reviewing");
    expect(resolvePhase(confirming, "PENDING").phase).toBe("confirming");
  });

  it("shows paid to the payer and already paid to everyone else", () => {
    expect(resolvePhase(confirming, "PAID").phase).toBe("paid");
    expect(resolvePhase(initialState, "PAID").phase).toBe("already_paid");
    expect(resolvePhase(reviewed, "PAID").phase).toBe("already_paid");
  });

  it("lets expiry and cancellation override anything", () => {
    expect(resolvePhase(reviewed, "EXPIRED").phase).toBe("expired");
    expect(resolvePhase(confirming, "CANCELLED").phase).toBe("cancelled");
  });

  it("shows in progress when someone else is paying", () => {
    expect(resolvePhase(initialState, "PROCESSING").phase).toBe("in_progress");
    expect(resolvePhase(connected, "PROCESSING").phase).toBe("in_progress");
    expect(resolvePhase(confirming, "PROCESSING").phase).toBe("confirming");
  });

  it("surfaces a backend rejection of the submitted payment", () => {
    expect(resolvePhase(confirming, "FAILED", "Wrong amount.")).toEqual({
      phase: "failed",
      failure: "Wrong amount.",
    });
    // A previously failed request is still payable by a new visitor.
    expect(resolvePhase(initialState, "FAILED").phase).toBe("idle");
  });
});
