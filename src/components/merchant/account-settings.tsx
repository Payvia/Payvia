"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { PasswordInput } from "@/components/auth/password-input";
import { Badge } from "@/components/ui/badge";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { api, ApiError } from "@/lib/api";
import { queries } from "@/lib/api/queries";
import {
  changeEmailSchema,
  changePasswordSchema,
  type ChangeEmailInput,
  type ChangePasswordInput,
  type Session,
} from "@/lib/api/schemas";
import { formatDateTime } from "@/lib/format";
import { routes } from "@/lib/routes";
import { useMerchant } from "./merchant-provider";

// Account settings that exist only on the live backend. Each change that
// could lock the merchant out or move their money asks for the password.

const message = (error: unknown, fallback: string) =>
  error instanceof ApiError ? error.message : fallback;

/** True when the backend lists the endpoint but does not run it yet. */
const notBuilt = (error: unknown) =>
  error instanceof ApiError && error.code === "not_implemented";

export function NotificationsCard() {
  const merchant = useMerchant();
  const queryClient = useQueryClient();
  const update = useMutation({
    mutationFn: (notify_payments: boolean) =>
      api.merchant.update({ notify_payments }),
    onSuccess: (updated) => {
      queryClient.setQueryData(queries.me().queryKey, updated);
      toast.success(
        updated.notify_payments
          ? "Payment emails turned on"
          : "Payment emails turned off",
      );
    },
    onError: (error) =>
      toast.error(message(error, "Could not save your changes.")),
  });

  return (
    <Card className="p-4 md:p-5">
      <h2 className="text-sm">Notifications</h2>
      <label className="mt-3 flex items-start gap-2.5 text-xs">
        <input
          type="checkbox"
          // Shows the choice at once, and falls back if saving fails.
          checked={
            update.isPending ? update.variables : merchant.notify_payments
          }
          disabled={update.isPending}
          onChange={(event) => update.mutate(event.target.checked)}
          className="mt-px size-4 shrink-0 accent-ink"
        />
        <span>
          Email me when a payment is confirmed or needs attention
          <span className="block text-muted">Sent to {merchant.email}</span>
        </span>
      </label>
    </Card>
  );
}

function ChangePasswordDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      await api.account.changePassword(values);
      reset();
      onOpenChange(false);
      toast.success("Password changed. Your other devices were signed out.");
    } catch (error) {
      if (error instanceof ApiError && error.code === "password_incorrect") {
        setError("current_password", { message: error.message });
        return;
      }
      setError("root", {
        message: message(error, "Could not change your password."),
      });
    }
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!isSubmitting) onOpenChange(next);
      }}
      title="Change password"
      description="Your other devices will be signed out."
    >
      <form
        method="post"
        onSubmit={onSubmit}
        noValidate
        className="flex flex-col gap-4"
      >
        {errors.root ? (
          <Banner tone="danger">{errors.root.message}</Banner>
        ) : null}
        <Field
          label="Current password"
          error={errors.current_password?.message}
        >
          {(control) => (
            <PasswordInput
              {...control}
              {...register("current_password")}
              autoComplete="current-password"
            />
          )}
        </Field>
        <Field
          label="New password"
          error={errors.new_password?.message}
          hint="Use at least 10 characters for your password."
        >
          {(control) => (
            <PasswordInput
              {...control}
              {...register("new_password")}
              autoComplete="new-password"
            />
          )}
        </Field>
        <SubmitButton className="self-end" loading={isSubmitting}>
          Change password
        </SubmitButton>
      </form>
    </Dialog>
  );
}

function ChangeEmailDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ChangeEmailInput>({ resolver: zodResolver(changeEmailSchema) });
  const [sentTo, setSentTo] = useState<string>();

  const onSubmit = handleSubmit(async (values) => {
    try {
      await api.account.changeEmail(values);
      reset();
      setSentTo(values.new_email);
    } catch (error) {
      if (error instanceof ApiError && error.code === "password_incorrect") {
        setError("current_password", { message: error.message });
      } else if (error instanceof ApiError && error.code === "email_taken") {
        setError("new_email", { message: error.message });
      } else {
        setError("root", {
          message: message(error, "Could not change your email."),
        });
      }
    }
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (isSubmitting) return;
        if (!next) setSentTo(undefined);
        onOpenChange(next);
      }}
      title="Change email"
      description="We will send a confirmation link to the new address."
    >
      {sentTo ? (
        <Banner tone="success" title="Check your new inbox">
          We sent a link to {sentTo}. Your email changes once you open it; until
          then you keep signing in with the current one.
        </Banner>
      ) : (
        <form
          method="post"
          onSubmit={onSubmit}
          noValidate
          className="flex flex-col gap-4"
        >
          {errors.root ? (
            <Banner tone="danger">{errors.root.message}</Banner>
          ) : null}
          <Field label="New email" error={errors.new_email?.message}>
            {(control) => (
              <Input
                {...control}
                {...register("new_email")}
                type="email"
                autoComplete="email"
              />
            )}
          </Field>
          <Field
            label="Current password"
            error={errors.current_password?.message}
          >
            {(control) => (
              <PasswordInput
                {...control}
                {...register("current_password")}
                autoComplete="current-password"
              />
            )}
          </Field>
          <SubmitButton className="self-end" loading={isSubmitting}>
            Send confirmation link
          </SubmitButton>
        </form>
      )}
    </Dialog>
  );
}

/** "Chrome on macOS" from a user-agent string, or the string's start. */
function describeDevice(userAgent: string | undefined) {
  if (!userAgent) return "Unknown device";
  const browser = /Edg\//.test(userAgent)
    ? "Edge"
    : /Firefox\//.test(userAgent)
      ? "Firefox"
      : /Chrome\//.test(userAgent)
        ? "Chrome"
        : /Safari\//.test(userAgent)
          ? "Safari"
          : undefined;
  const system = /iPhone|iPad/.test(userAgent)
    ? "iOS"
    : /Android/.test(userAgent)
      ? "Android"
      : /Mac OS X/.test(userAgent)
        ? "macOS"
        : /Windows/.test(userAgent)
          ? "Windows"
          : /Linux/.test(userAgent)
            ? "Linux"
            : undefined;
  if (browser && system) return `${browser} on ${system}`;
  return browser ?? system ?? userAgent.slice(0, 40);
}

function SessionRow({ session }: { session: Session }) {
  const queryClient = useQueryClient();
  const end = useMutation({
    mutationFn: () => api.account.endSession(session.session_id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["sessions"] }),
    onError: (error) =>
      toast.error(message(error, "Could not sign that device out.")),
  });
  return (
    <li className="flex items-center justify-between gap-3 py-2.5">
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-[13px]">
          <span className="truncate">{describeDevice(session.user_agent)}</span>
          {session.current ? <Badge>This device</Badge> : null}
        </p>
        <p className="text-xs text-muted">
          Last active {formatDateTime(session.last_used_at)}
          {session.ip ? ` · ${session.ip}` : null}
        </p>
      </div>
      {session.current ? null : (
        <Button
          size="sm"
          variant="outline"
          loading={end.isPending}
          onClick={() => end.mutate()}
        >
          Sign out
        </Button>
      )}
    </li>
  );
}

function Sessions() {
  const { data, error } = useQuery({
    queryKey: ["sessions"],
    queryFn: api.account.sessions,
    retry: false,
  });
  const logoutAll = useMutation({
    mutationFn: api.auth.logoutAll,
    // Full page load so no cached data or routes outlive the session.
    onSuccess: () => window.location.assign(routes.login),
    onError: (error) =>
      toast.error(message(error, "Could not sign out everywhere.")),
  });

  // Listed in the backend's contract before it was built: say nothing then.
  if (notBuilt(error)) return null;

  return (
    <div className="mt-4 border-t border-line pt-4">
      <h3 className="text-xs">Where you are signed in</h3>
      {error ? (
        <p className="mt-2 text-xs text-muted">
          {message(error, "Could not load your devices.")}
        </p>
      ) : (
        <ul className="mt-1 divide-y divide-line">
          {data?.map((session) => (
            <SessionRow key={session.session_id} session={session} />
          ))}
        </ul>
      )}
      <Button
        size="sm"
        variant="outline"
        className="mt-2"
        loading={logoutAll.isPending}
        onClick={() => logoutAll.mutate()}
      >
        Sign out everywhere
      </Button>
    </div>
  );
}

export function SecurityCard() {
  const [dialog, setDialog] = useState<"password" | "email">();
  return (
    <Card className="p-4 md:p-5">
      <h2 className="text-sm">Sign-in and security</h2>
      <p className="text-xs text-muted">
        Your password, your email and the devices you are signed in on.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setDialog("password")}
        >
          Change password
        </Button>
        <Button size="sm" variant="outline" onClick={() => setDialog("email")}>
          Change email
        </Button>
      </div>
      <Sessions />
      <ChangePasswordDialog
        open={dialog === "password"}
        onOpenChange={(open) => setDialog(open ? "password" : undefined)}
      />
      <ChangeEmailDialog
        open={dialog === "email"}
        onOpenChange={(open) => setDialog(open ? "email" : undefined)}
      />
    </Card>
  );
}

export function DeleteAccountCard() {
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const remove = useMutation({
    mutationFn: () => api.account.delete(password),
    // Full page load: the account and its session are gone.
    onSuccess: () => window.location.assign(routes.home),
  });
  const ready = confirm === "DELETE" && password.length > 0;

  return (
    <Card className="p-4 md:p-5">
      <h2 className="text-sm">Delete account</h2>
      <p className="text-xs text-muted">
        Cancels your open payment links and removes your details, your
        customers&apos; details and your wallets. Amounts and transaction
        records are kept.
      </p>
      <Button
        size="sm"
        variant="outline"
        className="mt-3"
        onClick={() => setOpen(true)}
      >
        Delete account
      </Button>
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!remove.isPending) setOpen(next);
        }}
        title="Delete your PayVia account?"
        description="This cannot be undone."
      >
        <form
          method="post"
          noValidate
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (ready) remove.mutate();
          }}
        >
          {remove.error ? (
            <Banner tone="danger">
              {message(remove.error, "Could not delete your account.")}
            </Banner>
          ) : null}
          <Field label="Current password">
            {(control) => (
              <PasswordInput
                {...control}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
              />
            )}
          </Field>
          <Field label="Type DELETE to confirm">
            {(control) => (
              <Input
                {...control}
                value={confirm}
                onChange={(event) => setConfirm(event.target.value)}
                autoComplete="off"
                spellCheck={false}
              />
            )}
          </Field>
          <SubmitButton
            variant="danger"
            className="self-end"
            disabled={!ready}
            loading={remove.isPending}
          >
            Delete account
          </SubmitButton>
        </form>
      </Dialog>
    </Card>
  );
}
