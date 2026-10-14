"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { supportHref } from "@/components/merchant/nav";
import { Banner } from "@/components/ui/banner";
import { SubmitButton } from "@/components/ui/submit-button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { api, ApiError } from "@/lib/api";
import { loginSchema, type LoginInput } from "@/lib/api/schemas";
import { features } from "@/lib/features";
import { routes } from "@/lib/routes";
import { PasswordInput } from "./password-input";

export function LoginForm() {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const merchant = await api.auth.login(values);
      // Full page load so nothing cached while signed out carries over.
      window.location.assign(
        merchant.business_name ? routes.dashboard : routes.setup,
      );
      // Keep the button busy until the new page takes over.
      await new Promise(() => {});
    } catch (error) {
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
      <Field label="Password" error={errors.password?.message}>
        {(control) => (
          <PasswordInput
            {...control}
            {...register("password")}
            autoComplete="current-password"
            placeholder="Enter your password"
          />
        )}
      </Field>
      {features.backend ? (
        <Link
          href={routes.forgotPassword}
          className="self-start text-xs underline underline-offset-2"
        >
          Forgot password?
        </Link>
      ) : (
        <a
          href={`${supportHref}?subject=Password%20reset`}
          className="self-start text-xs underline underline-offset-2"
        >
          Forgot password?
        </a>
      )}
      <SubmitButton size="lg" loading={isSubmitting}>
        Log in
      </SubmitButton>
      <p className="flex justify-between text-xs text-muted">
        Don&apos;t have an account?
        <Link
          href={routes.signup}
          className="text-ink underline underline-offset-2"
        >
          Sign up
        </Link>
      </p>
    </form>
  );
}
