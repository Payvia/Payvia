"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { SubmitButton } from "@/components/ui/submit-button";
import { api, ApiError } from "@/lib/api";
import { resetPasswordSchema } from "@/lib/api/schemas";
import { routes } from "@/lib/routes";
import { PasswordInput } from "./password-input";

const formSchema = resetPasswordSchema
  .pick({ new_password: true })
  .extend({ confirm: z.string() })
  .refine((values) => values.confirm === values.new_password, {
    path: ["confirm"],
    message: "The two passwords do not match.",
  });
type FormValues = z.infer<typeof formSchema>;

export function ResetPasswordForm() {
  const token = useSearchParams().get("token");
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(formSchema) });
  const [done, setDone] = useState(false);

  const onSubmit = handleSubmit(async ({ new_password }) => {
    try {
      await api.auth.resetPassword({ token: token!, new_password });
      setDone(true);
    } catch (error) {
      setError("root", {
        message:
          error instanceof ApiError
            ? error.message
            : "Something went wrong. Please try again.",
      });
    }
  });

  if (!token) {
    return (
      <div className="flex flex-col gap-4">
        <Banner tone="danger">
          Open the link in the password reset email. If it has expired, ask for
          a new one.
        </Banner>
        <Button asChild size="lg" variant="outline">
          <Link href={routes.forgotPassword}>Send a new link</Link>
        </Button>
      </div>
    );
  }

  if (done) {
    return (
      <div className="flex flex-col gap-4">
        <Banner tone="success" title="Password changed">
          You have been signed out everywhere. Log in with your new password.
        </Banner>
        <Button asChild size="lg">
          {/* A full load: the old session's cookies have just been cleared. */}
          <a href={routes.login}>Log in</a>
        </Button>
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
        <Banner
          tone="danger"
          action={
            <Link
              href={routes.forgotPassword}
              className="shrink-0 underline underline-offset-2"
            >
              New link
            </Link>
          }
        >
          {errors.root.message}
        </Banner>
      ) : null}
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
            placeholder="Create a password"
          />
        )}
      </Field>
      <Field label="Repeat new password" error={errors.confirm?.message}>
        {(control) => (
          <PasswordInput
            {...control}
            {...register("confirm")}
            autoComplete="new-password"
            placeholder="Repeat the password"
          />
        )}
      </Field>
      <SubmitButton size="lg" loading={isSubmitting}>
        Set new password
      </SubmitButton>
    </form>
  );
}
