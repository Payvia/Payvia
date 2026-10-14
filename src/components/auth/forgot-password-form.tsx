"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Banner } from "@/components/ui/banner";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { api, ApiError } from "@/lib/api";
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/lib/api/schemas";
import { env } from "@/lib/env";
import { routes } from "@/lib/routes";
import { Turnstile } from "./turnstile";

const formSchema = forgotPasswordSchema.omit({ captcha_token: true });
type FormValues = Pick<ForgotPasswordInput, "email">;

const siteKey = env.turnstileSiteKey;

export function ForgotPasswordForm() {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema) });
  const [sentTo, setSentTo] = useState<string>();
  const [captchaRound, setCaptchaRound] = useState(0);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaFailed, setCaptchaFailed] = useState(false);

  const onSubmit = handleSubmit(async ({ email }) => {
    try {
      await api.auth.forgotPassword({
        email,
        captcha_token: captchaToken ?? undefined,
      });
      setSentTo(email);
    } catch (error) {
      // A token works once: get a fresh one before the next try.
      setCaptchaToken(null);
      setCaptchaRound((round) => round + 1);
      setError("root", {
        message:
          error instanceof ApiError
            ? error.message
            : "Something went wrong. Please try again.",
      });
    }
  });

  if (sentTo) {
    return (
      <div className="flex flex-col gap-4">
        <Banner tone="success" title="Check your inbox">
          If {sentTo} has a PayVia account, we have sent it a link to set a new
          password. The link works for 30 minutes.
        </Banner>
        <Link
          href={routes.login}
          className="self-start text-xs underline underline-offset-2"
        >
          Back to log in
        </Link>
      </div>
    );
  }

  return (
    <form
      method="post"
      onSubmit={onSubmit}
      noValidate
      className="flex flex-col gap-4"
    >
      {errors.root ? (
        <Banner tone="danger">{errors.root.message}</Banner>
      ) : null}
      <Field label="Email" error={errors.email?.message}>
        {(control) => (
          <Input
            {...control}
            {...register("email")}
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
          />
        )}
      </Field>
      {siteKey ? (
        <>
          <Turnstile
            round={captchaRound}
            siteKey={siteKey}
            onToken={(token) => {
              setCaptchaToken(token);
              if (token) setCaptchaFailed(false);
            }}
            onError={() => setCaptchaFailed(true)}
          />
          {captchaFailed ? (
            <Banner tone="danger" title="The security check did not load">
              Check your connection and turn off any ad or content blocker for
              this site, then reload the page.
            </Banner>
          ) : null}
        </>
      ) : null}
      <SubmitButton
        size="lg"
        loading={isSubmitting}
        disabled={Boolean(siteKey) && !captchaToken}
      >
        Send reset link
      </SubmitButton>
      <p className="flex justify-between text-xs text-muted">
        Remembered it?
        <Link
          href={routes.login}
          className="text-ink underline underline-offset-2"
        >
          Log in
        </Link>
      </p>
    </form>
  );
}
