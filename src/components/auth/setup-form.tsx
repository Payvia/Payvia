"use client";

import { useState, type ReactNode } from "react";
import { useMerchantQuery } from "@/components/merchant/merchant-provider";
import {
  AddTrustline,
  isMissingTrustline,
} from "@/components/merchant/add-trustline";
import { ConnectWallet } from "@/components/merchant/connect-wallet";
import { PasswordInput } from "./password-input";
import { FormStep } from "@/components/merchant/form-step";
import { Badge } from "@/components/ui/badge";
import { Banner } from "@/components/ui/banner";
import { SubmitButton } from "@/components/ui/submit-button";
import { Card } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { LogoUpload } from "@/components/ui/logo-upload";
import { api, ApiError } from "@/lib/api";
import { stellarAddressSchema, type Merchant } from "@/lib/api/schemas";
import { features } from "@/lib/features";
import { routes } from "@/lib/routes";

/** The setup form for a merchant that is loaded in the browser. */
export function LoadedSetupForm({ fallback }: { fallback: ReactNode }) {
  const loaded = useMerchantQuery(undefined, fallback);
  return loaded.merchant ? (
    <SetupForm merchant={loaded.merchant} />
  ) : (
    loaded.placeholder
  );
}

export function SetupForm({ merchant }: { merchant: Merchant }) {
  const [name, setName] = useState(merchant.business_name);
  const [logo, setLogo] = useState(merchant.logo_url);
  const [wallet, setWallet] = useState(merchant.recipient_wallet ?? "");
  const [password, setPassword] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);
  const [failure, setFailure] = useState<{ error: unknown; wallet: string }>();

  const trimmedName = name.trim();
  const trimmedWallet = wallet.trim();
  const walletValid = stellarAddressSchema.safeParse(trimmedWallet).success;
  const nameError =
    submitted && trimmedName.length < 2 ? "Enter a merchant name." : undefined;
  // The wallet can be added later from the dashboard, but not saved if wrong.
  const walletError =
    submitted && trimmedWallet && !walletValid
      ? "Enter a valid Stellar wallet address."
      : undefined;
  // Adding a wallet takes the account password on the live backend.
  const needsPassword =
    features.backend &&
    walletValid &&
    trimmedWallet !== merchant.recipient_wallet;
  const wrongPassword =
    failure?.error instanceof ApiError &&
    failure.error.code === "password_incorrect";

  async function save() {
    setSubmitted(true);
    if (trimmedName.length < 2 || (trimmedWallet && !walletValid)) return;
    if (needsPassword && !password) return;

    setPending(true);
    setFailure(undefined);
    try {
      await api.merchant.update({
        business_name: trimmedName,
        logo_url: logo,
        ...(trimmedWallet ? { recipient_wallet: trimmedWallet } : {}),
        ...(needsPassword ? { current_password: password } : {}),
      });
      // Full page load so the app shell picks up the completed profile.
      window.location.assign(routes.dashboard);
    } catch (error) {
      setFailure({ error, wallet: trimmedWallet });
      setPending(false);
    }
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    void save();
  }

  return (
    <Card className="p-5 md:p-6">
      <h1 className="text-base">Merchant setup</h1>
      <p className="mt-1 text-xs text-muted">
        Add the details customers see on your payment pages.
      </p>
      <form method="post" onSubmit={onSubmit} noValidate className="mt-5">
        <FormStep
          number={1}
          title="Merchant profile"
          description="Help customers recognise your payment pages."
          complete={Boolean(trimmedName)}
        >
          <Field label="Merchant name" error={nameError}>
            {(control) => (
              <Input
                {...control}
                value={name}
                onChange={(event) => setName(event.target.value)}
                autoComplete="organization"
                placeholder="ABC Digital"
              />
            )}
          </Field>
          {features.logo ? (
            <LogoUpload
              value={logo}
              onChange={setLogo}
              label="Merchant logo (optional)"
            />
          ) : null}
        </FormStep>
        <FormStep
          number={2}
          title="Receiving wallet"
          description="Payments are sent directly to this Stellar wallet."
          complete={walletValid}
          last
        >
          <Field label="Default receiving wallet" error={walletError}>
            {(control) => (
              <Input
                {...control}
                value={wallet}
                onChange={(event) => setWallet(event.target.value)}
                autoComplete="off"
                spellCheck={false}
                placeholder="Enter your Stellar wallet address"
                className="font-mono md:text-xs"
              />
            )}
          </Field>
          <ConnectWallet onAddress={setWallet} disabled={pending} />
          {needsPassword ? (
            <Field
              label="Account password"
              hint="Confirms it is you choosing where payments are sent."
              error={
                wrongPassword
                  ? (failure!.error as ApiError).message
                  : submitted && !password
                    ? "Enter your password."
                    : undefined
              }
            >
              {(control) => (
                <PasswordInput
                  {...control}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                />
              )}
            </Field>
          ) : null}
          <p className="flex items-center gap-2 text-xs text-muted">
            <Badge tone="danger">Testnet</Badge>
            USDC on Stellar Testnet only. You can add this later.
          </p>
          {!failure || wrongPassword ? null : isMissingTrustline(
              failure.error,
            ) ? (
            <AddTrustline
              error={failure.error}
              address={failure.wallet}
              onAdded={save}
            />
          ) : (
            <Banner tone="danger">
              {failure.error instanceof ApiError
                ? failure.error.message
                : "Something went wrong. Please try again."}
            </Banner>
          )}
          <SubmitButton size="lg" loading={pending}>
            Continue
          </SubmitButton>
        </FormStep>
      </form>
    </Card>
  );
}
