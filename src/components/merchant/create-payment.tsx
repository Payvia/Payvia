"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence } from "motion/react";
import * as m from "motion/react-m";
import Link from "next/link";
import {
  Controller,
  useForm,
  useWatch,
  type FieldErrors,
  type Resolver,
} from "react-hook-form";
import { z } from "zod";
import {
  AddTrustline,
  isMissingTrustline,
} from "@/components/merchant/add-trustline";
import { PasswordInput } from "@/components/auth/password-input";
import { ConnectWallet } from "@/components/merchant/connect-wallet";
import { QRCode } from "@/components/qr/qr-code";
import { Badge } from "@/components/ui/badge";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { SubmitButton } from "@/components/ui/submit-button";
import { Card } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/ui/status-badge";
import { useCopy } from "@/hooks/use-copy";
import { api, ApiError } from "@/lib/api";
import { queries } from "@/lib/api/queries";
import {
  amountSchema,
  createPaymentSchema,
  stellarAddressSchema,
  type CreatePaymentInput,
  type Payment,
} from "@/lib/api/schemas";
import { formatAssetAmount, formatPaymentUrl } from "@/lib/format";
import { duration, ease } from "@/lib/motion/tokens";
import { features } from "@/lib/features";
import { routes } from "@/lib/routes";
import { whatsAppUrl } from "@/lib/share";
import { DetailList, DetailRow } from "./detail-list";
import { FormStep } from "./form-step";
import { useMerchant } from "./merchant-provider";

type FormValues = {
  amount: string;
  expiry: "NONE" | "24H";
  asset: string;
  description: string;
  reference: string;
  customer_name: string;
  customer_email: string;
  note: string;
  due_date: string;
  recipient_wallet: string;
  current_password: string;
};

// The form holds empty strings for untouched fields; the API wants them absent.
const formSchema = z.preprocess(
  (values) =>
    Object.fromEntries(
      Object.entries(values as FormValues)
        .map(([key, value]) => [key, value.trim()])
        .filter(([, value]) => value !== ""),
    ),
  createPaymentSchema.extend({
    amount: z
      .string({ error: "Enter an amount to continue." })
      .pipe(createPaymentSchema.shape.amount),
    asset: z.enum(["USDC"], { error: "Select an asset." }),
    description: z
      .string({ error: "Enter a description." })
      .pipe(createPaymentSchema.shape.description),
    recipient_wallet: z
      .string({ error: "Enter a valid Stellar wallet address." })
      .pipe(stellarAddressSchema),
    due_date: createPaymentSchema.shape.due_date.refine(
      (value) => !value || value >= new Date().toISOString().slice(0, 10),
      { message: "Choose today or a later date." },
    ),
  }),
);

const resolver: Resolver<FormValues, unknown, CreatePaymentInput> = (
  values,
) => {
  const result = formSchema.safeParse(values);
  if (result.success) return { values: result.data, errors: {} };

  const errors: FieldErrors<FormValues> = {};
  for (const issue of result.error.issues) {
    const field = issue.path[0] as keyof FormValues;
    // Keep the first message per field.
    errors[field] ??= { type: issue.code, message: issue.message };
  }
  return { values: {}, errors };
};

const assetOptions = [{ value: "USDC", label: "USDC · USD Coin" }];
const networkLabel = { TESTNET: "Stellar Testnet", PUBLIC: "Stellar" } as const;

function Locked() {
  return (
    <div className="flex h-24 items-center justify-center rounded-xl bg-field text-xs text-muted">
      Select an asset first.
    </div>
  );
}

function RecentRequests({ highlight }: { highlight?: string }) {
  const { data } = useQuery(queries.payments({ limit: 4 }));
  return (
    <Card className="p-4">
      <h2 className="text-sm">Recent requests</h2>
      <p className="text-xs text-muted">Latest payment links created.</p>
      {!data ? (
        <Skeleton className="mt-4 h-24" />
      ) : data.items.length === 0 ? (
        <p className="flex min-h-40 items-center justify-center text-xs text-muted">
          No requests yet.
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-line">
          {data.items.map((payment) => (
            <m.li
              key={payment.payment_id}
              layout
              initial={
                payment.payment_id === highlight
                  ? { opacity: 0, backgroundColor: "var(--color-brand-soft)" }
                  : false
              }
              animate={{ opacity: 1, backgroundColor: "rgba(0,0,0,0)" }}
              transition={{ duration: duration.hero, ease: ease.out }}
              className="-mx-2 rounded-lg px-2 py-3"
            >
              <Link href={routes.payment(payment.payment_id)} className="block">
                <span className="block truncate text-[13px]">
                  {payment.description}
                </span>
                <span className="block truncate text-xs text-muted">
                  {formatAssetAmount(payment.amount, payment.asset)}
                  {payment.reference ? ` · ${payment.reference}` : ""}
                </span>
                <StatusBadge status={payment.status} className="mt-2" />
              </Link>
            </m.li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function GeneratedPanel({
  payment,
  onReset,
}: {
  payment: Payment;
  onReset: () => void;
}) {
  const merchant = useMerchant();
  const copy = useCopy();
  const merchantName = merchant.business_name || merchant.name;

  return (
    <m.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      transition={{ duration: duration.slow, ease: ease.out }}
      className="overflow-hidden"
    >
      <p role="status" className="sr-only">
        Payment link created successfully
      </p>
      <div className="grid gap-5 md:grid-cols-[1fr_11rem]">
        <div className="min-w-0">
          <DetailList>
            <DetailRow label="Payment link" mono>
              <span className="truncate">
                {formatPaymentUrl(payment.payment_url)}
              </span>
              <CopyButton value={payment.payment_url} label="payment link" />
            </DetailRow>
            <DetailRow label="Asset">
              <Badge>
                {payment.asset} on {networkLabel[payment.network]}
              </Badge>
            </DetailRow>
            <DetailRow label="Amount">
              {formatAssetAmount(payment.amount, payment.asset)}
            </DetailRow>
            {payment.reference ? (
              <DetailRow label="Reference">{payment.reference}</DetailRow>
            ) : null}
          </DetailList>
          <Banner className="mt-3">
            Share this link or QR code with your customer. The payment is
            verified on Stellar before it is marked Paid.
          </Banner>
        </div>
        <div className="flex flex-col gap-2">
          <div className="flex justify-center rounded-xl bg-field p-3">
            <m.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                duration: duration.slow,
                ease: ease.out,
                delay: 0.15,
              }}
            >
              <QRCode value={payment.payment_url} size={144} />
            </m.div>
          </div>
          <Button onClick={() => copy(payment.payment_url, "payment link")}>
            Copy link
          </Button>
          <Button asChild variant="outline">
            <a
              href={whatsAppUrl(payment, merchantName)}
              target="_blank"
              rel="noreferrer"
            >
              Share on WhatsApp
            </a>
          </Button>
          <Button asChild variant="outline">
            <Link href={routes.qr(payment.payment_id)}>View QR</Link>
          </Button>
          <Button asChild variant="outline">
            <a href={payment.payment_url} target="_blank" rel="noreferrer">
              View payment page
            </a>
          </Button>
        </div>
      </div>
      <Button variant="ghost" className="mt-4" onClick={onReset}>
        Create another request
      </Button>
    </m.div>
  );
}

export function CreatePayment() {
  const merchant = useMerchant();
  const queryClient = useQueryClient();

  const defaultValues: FormValues = {
    amount: "",
    expiry: "NONE",
    asset: "",
    description: "",
    reference: "",
    customer_name: "",
    customer_email: "",
    note: "",
    due_date: "",
    recipient_wallet: merchant.recipient_wallet ?? "",
    current_password: "",
  };

  const {
    register,
    control,
    handleSubmit,
    setError,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormValues, unknown, CreatePaymentInput>({
    resolver,
    defaultValues,
  });
  const values = useWatch({ control });

  const create = useMutation({
    mutationFn: api.payments.create,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["payments"] }),
  });
  const created = create.data;
  const locked = Boolean(created) || create.isPending;

  const assetChosen = Boolean(values.asset);
  const amountDone =
    amountSchema.safeParse(values.amount?.trim()).success &&
    Number(values.amount) > 0;
  const descriptionDone = Boolean(values.description?.trim());
  const walletDone = stellarAddressSchema.safeParse(
    values.recipient_wallet?.trim(),
  ).success;
  // A wallet the account has not used before is added with this request, and
  // the live backend asks for the account password to add one.
  const newWallet =
    features.backend &&
    walletDone &&
    !merchant.wallets.includes(values.recipient_wallet?.trim() ?? "");
  const wrongPassword =
    create.error instanceof ApiError &&
    create.error.code === "password_incorrect";

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[1fr_17rem]">
      <Card className="p-4 md:p-5">
        <h2 className="text-sm">Create payment request</h2>
        <p className="mb-5 text-xs text-muted" aria-live="polite">
          {created
            ? "Your payment link is ready to share."
            : "Enter payment details to create a shareable link and QR code."}
        </p>

        <form
          method="post"
          noValidate
          onSubmit={handleSubmit((input) => {
            if (newWallet && !input.current_password) {
              setError("current_password", {
                message: "Enter your password.",
              });
              return;
            }
            create.mutate(input);
          })}
        >
          <FormStep
            number={1}
            title="Amount"
            description={
              created
                ? "The amount your customer will pay."
                : "Enter the amount you want to receive."
            }
            complete={amountDone}
          >
            <Field label="Amount" error={errors.amount?.message}>
              {(field) => (
                <Input
                  {...field}
                  {...register("amount")}
                  readOnly={locked}
                  inputMode="decimal"
                  autoComplete="off"
                  placeholder="0.00"
                />
              )}
            </Field>
            <div className="flex flex-col gap-2">
              <span className="text-xs">Expiry</span>
              <Controller
                control={control}
                name="expiry"
                render={({ field }) => (
                  <SegmentedControl
                    aria-label="Expiry"
                    value={field.value}
                    onValueChange={(next) => {
                      if (!locked) field.onChange(next);
                    }}
                    segments={[
                      features.noExpiry
                        ? {
                            value: "NONE",
                            label: "No expiry",
                            description: "Until paid",
                          }
                        : {
                            value: "NONE",
                            label: "7 days",
                            description: "From creation",
                          },
                      {
                        value: "24H",
                        label: "24 hours",
                        description: "From creation",
                      },
                    ]}
                  />
                )}
              />
              <p className="text-xs text-muted">
                {values.expiry === "24H"
                  ? "The link stops working 24 hours after you create it."
                  : features.noExpiry
                    ? "The link stays available until it is paid or cancelled."
                    : "The link stops working 7 days after you create it."}
              </p>
            </div>
          </FormStep>

          <FormStep
            number={2}
            title="Choose asset"
            description={
              created
                ? "The currency you will receive."
                : "Select the currency you want to receive."
            }
            complete={assetChosen}
          >
            <Field label="Asset" error={errors.asset?.message}>
              {(field) => (
                <Controller
                  control={control}
                  name="asset"
                  render={({ field: { value, onChange } }) => (
                    <Select
                      {...field}
                      value={value || undefined}
                      onValueChange={onChange}
                      disabled={locked}
                      placeholder="Select asset"
                      options={assetOptions}
                    />
                  )}
                />
              )}
            </Field>
          </FormStep>

          <FormStep
            number={3}
            title="Description"
            description={
              created
                ? "Payment information for your customer."
                : "Tell your customer what the payment is for."
            }
            complete={assetChosen && descriptionDone}
          >
            {assetChosen ? (
              <>
                <Field label="Description" error={errors.description?.message}>
                  {(field) => (
                    <Input
                      {...field}
                      {...register("description")}
                      readOnly={locked}
                      maxLength={120}
                      placeholder="Website Design"
                    />
                  )}
                </Field>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field
                    label="Reference"
                    optional
                    error={errors.reference?.message}
                  >
                    {(field) => (
                      <Input
                        {...field}
                        {...register("reference")}
                        readOnly={locked}
                        placeholder="INV-00124"
                      />
                    )}
                  </Field>
                  <Field
                    label="Customer name"
                    optional
                    error={errors.customer_name?.message}
                  >
                    {(field) => (
                      <Input
                        {...field}
                        {...register("customer_name")}
                        readOnly={locked}
                        placeholder="John"
                      />
                    )}
                  </Field>
                  <Field
                    label="Due date"
                    optional
                    error={errors.due_date?.message}
                  >
                    {(field) => (
                      <Input
                        {...field}
                        {...register("due_date")}
                        readOnly={locked}
                        type="date"
                      />
                    )}
                  </Field>
                </div>
                <div className="grid gap-4 sm:grid-cols-3">
                  <Field
                    label="Customer email"
                    optional
                    error={errors.customer_email?.message}
                    hint={
                      features.backend
                        ? "Lets you email the link from the request."
                        : undefined
                    }
                  >
                    {(field) => (
                      <Input
                        {...field}
                        {...register("customer_email")}
                        readOnly={locked}
                        type="email"
                        autoComplete="off"
                        placeholder="john@example.com"
                      />
                    )}
                  </Field>
                  <Field
                    label="Note to customer"
                    optional
                    className="sm:col-span-2"
                    error={errors.note?.message}
                    hint="Shown on the payment page."
                  >
                    {(field) => (
                      <Input
                        {...field}
                        {...register("note")}
                        readOnly={locked}
                        maxLength={500}
                        placeholder="Thanks for your business"
                      />
                    )}
                  </Field>
                </div>
              </>
            ) : (
              <Locked />
            )}
          </FormStep>

          <FormStep
            number={4}
            title="Recipient wallet"
            description={
              created
                ? "Your Stellar Testnet receiving wallet."
                : "Use your Stellar Testnet receiving wallet."
            }
            complete={assetChosen && walletDone}
          >
            {assetChosen ? (
              <>
                <Field
                  label="Recipient wallet"
                  error={errors.recipient_wallet?.message}
                  hint={`${values.asset} on ${networkLabel[merchant.network]}`}
                >
                  {(field) => (
                    <Input
                      {...field}
                      {...register("recipient_wallet")}
                      readOnly={locked}
                      autoComplete="off"
                      spellCheck={false}
                      placeholder="Enter your Stellar wallet address"
                      className="font-mono md:text-xs"
                      trailing={
                        walletDone ? (
                          <CopyButton
                            value={values.recipient_wallet ?? ""}
                            label="wallet address"
                          />
                        ) : null
                      }
                    />
                  )}
                </Field>
                {locked ? null : (
                  <ConnectWallet
                    onAddress={(address) =>
                      setValue("recipient_wallet", address, {
                        shouldDirty: true,
                        shouldValidate: true,
                      })
                    }
                  />
                )}
                {newWallet && !locked ? (
                  <Field
                    label="Account password"
                    hint="This wallet is new to your account. Your password confirms adding it."
                    error={
                      wrongPassword
                        ? (create.error as ApiError).message
                        : errors.current_password?.message
                    }
                  >
                    {(field) => (
                      <PasswordInput
                        {...field}
                        {...register("current_password")}
                        autoComplete="current-password"
                      />
                    )}
                  </Field>
                ) : null}
              </>
            ) : (
              <Locked />
            )}
          </FormStep>

          <FormStep
            number={5}
            title={created ? "Payment details" : "Generate payment link"}
            description={
              created
                ? "Use this payment link or QR code to receive payment."
                : "Create a link and QR code for this request."
            }
            complete={Boolean(created)}
            last
          >
            <AnimatePresence mode="wait" initial={false}>
              {created ? (
                <GeneratedPanel
                  key="generated"
                  payment={created}
                  onReset={() => {
                    create.reset();
                    reset(defaultValues);
                  }}
                />
              ) : (
                <m.div
                  key="submit"
                  exit={{ opacity: 0 }}
                  transition={{ duration: duration.fast }}
                  className="flex flex-col gap-3"
                >
                  {!create.error || wrongPassword ? null : isMissingTrustline(
                      create.error,
                    ) ? (
                    <AddTrustline
                      error={create.error}
                      address={create.variables.recipient_wallet}
                      onAdded={() => create.mutate(create.variables)}
                    />
                  ) : (
                    <Banner tone="danger" title="Could not create the request">
                      {create.error instanceof ApiError
                        ? create.error.message
                        : "Something went wrong. Please try again."}
                    </Banner>
                  )}
                  <SubmitButton size="lg" loading={create.isPending}>
                    Generate payment link
                  </SubmitButton>
                </m.div>
              )}
            </AnimatePresence>
          </FormStep>
        </form>
      </Card>

      <RecentRequests highlight={created?.payment_id} />
    </div>
  );
}
