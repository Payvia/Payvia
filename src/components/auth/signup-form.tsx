"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Banner } from "@/components/ui/banner";
import { SubmitButton } from "@/components/ui/submit-button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { api, ApiError } from "@/lib/api";
import { signupSchema } from "@/lib/api/schemas";
import { env } from "@/lib/env";
import { routes } from "@/lib/routes";
import { PasswordInput } from "./password-input";
import { Turnstile } from "./turnstile";

const formSchema = signupSchema.omit({ captcha_token: true }).extend({
  accept_terms: z.literal(true, "Accept the terms to create an account."),
});
type FormValues = z.input<typeof formSchema>;

const siteKey = env.turnstileSiteKey;

export function SignupForm() {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema) });
  const [captchaRound, setCaptchaRound] = useState(0);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaFailed, setCaptchaFailed] = useState(false);

  const onSubmit = handleSubmit(async ({ name, email, password }) => {
    try {
      await api.auth.signup({
        name,
        email,
        password,
        captcha_token: captchaToken ?? undefined,
      });
      // Full page load so nothing cached while signed out carries over.
      window.location.assign(routes.setup);
      // Keep the button busy until the new page takes over.
      await new Promise(() => {});
    } catch (error) {
      // A token works once: get a fresh one before the next try.
      setCaptchaToken(null);
      setCaptchaRound((round) => round + 1);
      if (error instanceof ApiError && error.code === "email_taken") {
        setError("email", { message: error.message });
        return;
      }
      setError("root", {
        message:
          error instanceof ApiError
            ? error.message
            : "Something went wrong. Please try again.",
      });
    }
  });

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
      <Field label="Name" error={errors.name?.message}>
        {(control) => (
          <Input
            {...control}
            {...register("name")}
            autoComplete="name"
            placeholder="Your name"
          />
        )}
      </Field>
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
      <Field
        label="Password"
        error={errors.password?.message}
        hint="Use at least 10 characters for your password."
      >
        {(control) => (
          <PasswordInput
            {...control}
            {...register("password")}
            autoComplete="new-password"
            placeholder="Create a password"
          />
        )}
      </Field>
      <div className="flex flex-col gap-2">
        <label className="flex items-start gap-2.5 text-xs">
          <input
            type="checkbox"
            {...register("accept_terms")}
            aria-invalid={errors.accept_terms ? true : undefined}
            aria-describedby={errors.accept_terms ? "terms-error" : undefined}
            className="mt-px size-4 shrink-0 accent-ink"
          />
          I agree to PayVia&apos;s Terms of Service.
        </label>
        {errors.accept_terms ? (
          <p id="terms-error" role="alert" className="text-xs text-danger-ink">
            {errors.accept_terms.message}
          </p>
        ) : null}
      </div>
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
        // With the captcha on, there is nothing to send until it has passed.
        disabled={Boolean(siteKey) && !captchaToken}
      >
        Create account
      </SubmitButton>
      <p className="flex justify-between text-xs text-muted">
        Already have an account?
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
