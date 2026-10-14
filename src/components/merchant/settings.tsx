"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  AddTrustline,
  isMissingTrustline,
} from "@/components/merchant/add-trustline";
import { PasswordInput } from "@/components/auth/password-input";
import { ConnectWallet } from "@/components/merchant/connect-wallet";
import { InstallApp } from "@/components/pwa/install-app";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { Card, Eyebrow } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { LogoUpload } from "@/components/ui/logo-upload";
import { api, ApiError } from "@/lib/api";
import { queries } from "@/lib/api/queries";
import {
  stellarAddressSchema,
  type UpdateMerchantInput,
} from "@/lib/api/schemas";
import { features } from "@/lib/features";
import { useInstallState } from "@/lib/pwa/install";
import { routes } from "@/lib/routes";
import {
  DeleteAccountCard,
  NotificationsCard,
  SecurityCard,
} from "./account-settings";
import { DetailList } from "./detail-list";
import { useMerchant } from "./merchant-provider";

const networkLabel = { TESTNET: "Stellar Testnet", PUBLIC: "Stellar" } as const;

function useUpdateMerchant(successMessage: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: UpdateMerchantInput) => api.merchant.update(input),
    onSuccess: (merchant) => {
      queryClient.setQueryData(queries.me().queryKey, merchant);
      toast.success(successMessage);
    },
  });
}

function errorMessage(error: unknown) {
  return error instanceof ApiError
    ? error.message
    : "Could not save your changes. Please try again.";
}

function ProfileCard() {
  const merchant = useMerchant();
  const [name, setName] = useState(merchant.business_name);
  const [logo, setLogo] = useState(merchant.logo_url);
  const [touched, setTouched] = useState(false);
  const update = useUpdateMerchant("Merchant profile saved");

  const trimmed = name.trim();
  const dirty =
    trimmed !== merchant.business_name || logo !== merchant.logo_url;

  return (
    <Card className="p-4 md:p-5">
      <h2 className="text-sm">Merchant profile</h2>
      <p className="text-xs text-muted">
        Details shown to customers on your payment pages.
      </p>
      <form
        method="post"
        noValidate
        className="mt-4 flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          setTouched(true);
          if (trimmed.length >= 2)
            update.mutate({ business_name: trimmed, logo_url: logo });
        }}
      >
        <Field
          label="Merchant name"
          error={
            touched && trimmed.length < 2 ? "Enter a merchant name." : undefined
          }
        >
          {(control) => (
            <Input
              {...control}
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="organization"
            />
          )}
        </Field>
        {features.logo ? <LogoUpload value={logo} onChange={setLogo} /> : null}
        {update.error ? (
          <Banner tone="danger">{errorMessage(update.error)}</Banner>
        ) : null}
        <SubmitButton
          className="self-start"
          disabled={!dirty}
          loading={update.isPending}
        >
          Save changes
        </SubmitButton>
      </form>
    </Card>
  );
}

function WalletCard() {
  const merchant = useMerchant();
  const saved = merchant.recipient_wallet ?? "";
  const [wallet, setWallet] = useState(saved);
  const [password, setPassword] = useState("");
  const [touched, setTouched] = useState(false);
  const update = useUpdateMerchant("Receiving wallet updated");

  const trimmed = wallet.trim();
  const valid = stellarAddressSchema.safeParse(trimmed).success;
  // Changing where money goes takes the account password on the live backend.
  const needsPassword = features.backend && trimmed !== saved;
  const wrongPassword =
    update.error instanceof ApiError &&
    update.error.code === "password_incorrect";

  return (
    <Card className="p-4 md:p-5">
      <h2 className="text-sm">Receiving wallet</h2>
      <p className="text-xs text-muted">
        Funds are sent directly to your Stellar wallet.
      </p>
      <form
        method="post"
        noValidate
        className="mt-4 flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          setTouched(true);
          if (!valid || (needsPassword && !password)) return;
          update.mutate(
            {
              recipient_wallet: trimmed,
              ...(needsPassword ? { current_password: password } : {}),
            },
            { onSuccess: () => setPassword("") },
          );
        }}
      >
        <Field
          label="Recipient wallet"
          error={
            touched && !valid
              ? "Enter a valid Stellar wallet address."
              : undefined
          }
          hint={`USDC on ${networkLabel[merchant.network]}. Confirm the address before creating requests.`}
        >
          {(control) => (
            <Input
              {...control}
              value={wallet}
              onChange={(event) => setWallet(event.target.value)}
              autoComplete="off"
              spellCheck={false}
              placeholder="Enter your Stellar wallet address"
              className="font-mono md:text-xs"
              trailing={
                saved ? (
                  <CopyButton value={saved} label="wallet address" />
                ) : null
              }
            />
          )}
        </Field>
        <ConnectWallet onAddress={setWallet} disabled={update.isPending} />
        {needsPassword ? (
          <Field
            label="Account password"
            hint="Confirms it is you changing where payments are sent."
            error={
              wrongPassword
                ? errorMessage(update.error)
                : touched && !password
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
        {!update.error || wrongPassword ? null : isMissingTrustline(
            update.error,
          ) && update.variables.recipient_wallet ? (
          <AddTrustline
            error={update.error}
            address={update.variables.recipient_wallet}
            onAdded={() => update.mutate(update.variables)}
          />
        ) : (
          <Banner tone="danger">{errorMessage(update.error)}</Banner>
        )}
        <SubmitButton
          variant="outline"
          className="self-start"
          disabled={trimmed === saved}
          loading={update.isPending}
        >
          {saved ? "Update wallet" : "Add wallet"}
        </SubmitButton>
      </form>
    </Card>
  );
}

function AccountCard() {
  const merchant = useMerchant();
  const logout = useMutation({
    mutationFn: api.auth.logout,
    // Full page load so no cached data or routes outlive the session.
    onSuccess: () => window.location.assign(routes.login),
    onError: () => toast.error("Could not log out. Please try again."),
  });

  return (
    <Card className="p-4 md:p-5">
      <h2 className="text-sm">Account</h2>
      <p className="text-xs text-muted">Your merchant account information.</p>
      <DetailList className="mt-2">
        <div className="py-2.5">
          <dt className="text-xs text-muted">Merchant</dt>
          <dd className="mt-0.5 text-[13px]">
            {merchant.business_name || merchant.name}
          </dd>
        </div>
        <div className="py-2.5">
          <dt className="text-xs text-muted">Email</dt>
          <dd className="mt-0.5 text-[13px] break-all">{merchant.email}</dd>
        </div>
        <div className="py-2.5">
          <dt className="text-xs text-muted">Network</dt>
          <dd className="mt-0.5 text-[13px]">
            {networkLabel[merchant.network]}
          </dd>
        </div>
      </DetailList>
      <Button
        variant="outline"
        className="mt-3 w-full"
        loading={logout.isPending}
        onClick={() => logout.mutate()}
      >
        Log out
      </Button>
    </Card>
  );
}

export function Settings() {
  const installable = useInstallState() !== "unavailable";

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_17rem]">
      <div className="flex min-w-0 flex-col gap-6">
        <section className="flex flex-col gap-3">
          <Eyebrow>Merchant profile</Eyebrow>
          <ProfileCard />
        </section>
        <section className="flex flex-col gap-3">
          <Eyebrow>Receiving wallet</Eyebrow>
          <WalletCard />
        </section>
        {features.backend ? (
          <>
            <section className="flex flex-col gap-3">
              <Eyebrow>Notifications</Eyebrow>
              <NotificationsCard />
            </section>
            <section className="flex flex-col gap-3">
              <Eyebrow>Security</Eyebrow>
              <SecurityCard />
            </section>
            <section className="flex flex-col gap-3">
              <Eyebrow>Danger zone</Eyebrow>
              <DeleteAccountCard />
            </section>
          </>
        ) : null}
      </div>
      <div className="flex flex-col gap-6">
        <section className="flex flex-col gap-3">
          <Eyebrow>Account</Eyebrow>
          <AccountCard />
        </section>
        {installable ? (
          <section className="flex flex-col gap-3">
            <Eyebrow>App</Eyebrow>
            <InstallApp />
          </section>
        ) : null}
      </div>
    </div>
  );
}
