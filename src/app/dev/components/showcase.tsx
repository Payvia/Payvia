"use client";

import { Link2, Plus } from "lucide-react";
import { useState, type ReactNode } from "react";
import { CountUp } from "@/components/motion/count-up";
import { Reveal } from "@/components/motion/reveal";
import { SplitHeading } from "@/components/motion/split-heading";
import { Stagger, StaggerItem } from "@/components/motion/stagger";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Banner } from "@/components/ui/banner";
import { Button } from "@/components/ui/button";
import { Card, Eyebrow } from "@/components/ui/card";
import { CopyButton } from "@/components/ui/copy-button";
import { Dialog, Sheet } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input, Textarea } from "@/components/ui/input";
import { ProgressBar } from "@/components/ui/progress-bar";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState, ErrorState } from "@/components/ui/state";
import { StatusBadge } from "@/components/ui/status-badge";
import { paymentStatuses, statusFilters } from "@/lib/api/schemas";

const swatches = [
  ["brand", "bg-brand"],
  ["brand-deep", "bg-brand-deep"],
  ["brand-soft", "bg-brand-soft"],
  ["success", "bg-success"],
  ["danger", "bg-danger"],
  ["danger-soft", "bg-danger-soft"],
  ["info-soft", "bg-info-soft"],
  ["ink", "bg-ink"],
  ["canvas", "bg-canvas"],
  ["field", "bg-field"],
  ["line", "bg-line"],
  ["muted", "bg-muted"],
] as const;

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <Eyebrow>{title}</Eyebrow>
      <Card className="flex flex-wrap items-start gap-3 p-5">{children}</Card>
    </section>
  );
}

export function Showcase() {
  const [expiry, setExpiry] = useState<"NONE" | "24H">("NONE");
  const [filter, setFilter] = useState<(typeof statusFilters)[number]>("ALL");
  const [asset, setAsset] = useState<string>();
  const [amount, setAmount] = useState("");
  const [dialog, setDialog] = useState(false);
  const [sheet, setSheet] = useState(false);

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-8 px-4 py-10">
      <header>
        <SplitHeading
          as="h1"
          immediate
          className="text-5xl leading-none tracking-[-0.03em]"
        >
          PayVia components
        </SplitHeading>
        <p className="mt-2 text-sm text-muted">
          Every primitive and state. Development only.
        </p>
      </header>

      <Section title="Colour">
        {swatches.map(([name, className]) => (
          <div key={name} className="w-24 text-[11px]">
            <div
              className={`h-12 rounded-lg border border-line ${className}`}
            />
            <p className="mt-1">{name}</p>
          </div>
        ))}
      </Section>

      <Section title="Type">
        <div className="flex flex-col gap-2">
          <p className="text-7xl leading-none tracking-[-0.03em]">Get paid.</p>
          <p className="text-[2.75rem] leading-[1.05] tracking-[-0.02em]">
            Create a link. Share it anywhere.
          </p>
          <p className="font-mono text-5xl">
            <CountUp value="4250" prefix="$" />
          </p>
          <p className="text-sm">Body 14 — Instrument Sans.</p>
          <p className="font-mono text-xs">payvia.app/pay/8Xk92Lm</p>
        </div>
      </Section>

      <Section title="Buttons">
        <Button>Create request</Button>
        <Button variant="outline">View payments</Button>
        <Button variant="soft">Cancel</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="danger">Cancel request</Button>
        <Button loading>Generating</Button>
        <Button disabled>Disabled</Button>
        <Button size="sm">
          <Plus className="size-3.5" />
          Small
        </Button>
        <div className="flex w-full flex-wrap gap-2 rounded-xl bg-brand p-4">
          <Button variant="brand-soft" pill size="lg">
            Connect Stellar Wallet
          </Button>
          <Button
            variant="brand"
            pill
            size="lg"
            className="ring-1 ring-white/30"
          >
            Approve payment
          </Button>
        </div>
      </Section>

      <Section title="Form controls">
        <div className="grid w-full gap-5 md:grid-cols-2">
          <Field
            label="Amount"
            hint="Enter the amount you want to receive."
            error={amount === "" ? "Enter an amount to continue." : undefined}
          >
            {(control) => (
              <Input
                {...control}
                inputMode="decimal"
                placeholder="Enter amount"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            )}
          </Field>
          <Field
            label="Choose asset"
            hint="Select the currency you want to receive."
          >
            {(control) => (
              <Select
                {...control}
                value={asset}
                onValueChange={setAsset}
                placeholder="Select asset"
                options={[{ value: "USDC", label: "USDC · USD Coin" }]}
              />
            )}
          </Field>
          <Field label="Recipient wallet" hint="USDC on Stellar Testnet">
            {(control) => (
              <Input
                {...control}
                readOnly
                defaultValue="GCFX…7K2M"
                trailing={
                  <CopyButton value="GCFX7K2M" label="wallet address" />
                }
              />
            )}
          </Field>
          <Field label="Reference" optional>
            {(control) => (
              <Input {...control} disabled defaultValue="INV-00124" />
            )}
          </Field>
          <Field label="Description" className="md:col-span-2">
            {(control) => (
              <Textarea {...control} placeholder="Website Design" />
            )}
          </Field>
          <div className="flex flex-col gap-2 md:col-span-2">
            <span className="text-xs">Expiry</span>
            <SegmentedControl
              aria-label="Expiry"
              value={expiry}
              onValueChange={setExpiry}
              segments={[
                {
                  value: "NONE",
                  label: "No expiry",
                  description: "Until paid",
                },
                {
                  value: "24H",
                  label: "24 hours",
                  description: "From creation",
                },
              ]}
            />
          </div>
          <SegmentedControl
            aria-label="Filter by status"
            className="md:col-span-2"
            value={filter}
            onValueChange={setFilter}
            segments={statusFilters.map((value) => ({
              value,
              label: value[0] + value.slice(1).toLowerCase(),
            }))}
          />
        </div>
      </Section>

      <Section title="Status">
        {paymentStatuses.map((status) => (
          <StatusBadge key={status} status={status} />
        ))}
        <Badge tone="danger">Testnet</Badge>
        <Badge tone="success">Paid</Badge>
        <Badge>USDC on Stellar Testnet</Badge>
      </Section>

      <Section title="Feedback">
        <div className="flex w-full flex-col gap-3">
          <Banner>You&apos;ll review everything before approving</Banner>
          <Banner tone="success" title="Paid">
            Payment received successfully.
          </Banner>
          <Banner
            tone="danger"
            title="Add your receiving wallet"
            action={<Button size="sm">Add wallet</Button>}
          >
            Add a Stellar wallet to start receiving payment requests.
          </Banner>
          <ProgressBar label="Stellar confirmation" value={0.4} />
          <ProgressBar label="Waiting for wallet signature" />
          <div className="flex gap-3">
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 flex-1" />
          </div>
        </div>
      </Section>

      <Section title="Overlays and misc">
        <Button variant="outline" onClick={() => setDialog(true)}>
          Open dialog
        </Button>
        <Button variant="outline" onClick={() => setSheet(true)}>
          Open sheet
        </Button>
        <Avatar name="ABC Digital" />
        <Avatar name="ABC Digital" src="/images/avatar-placeholder.jpg" />
        <Dialog
          open={dialog}
          onOpenChange={setDialog}
          title="Cancel payment request?"
          description="Your customer will no longer be able to pay with this link."
        >
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDialog(false)}>
              Keep request
            </Button>
            <Button onClick={() => setDialog(false)}>Cancel request</Button>
          </div>
        </Dialog>
        <Sheet open={sheet} onOpenChange={setSheet} title="Connect a wallet">
          <div className="flex flex-col gap-2">
            <Button variant="soft" size="lg" className="justify-start">
              Freighter
            </Button>
            <Button variant="soft" size="lg" className="justify-start">
              Open in wallet app
            </Button>
          </div>
        </Sheet>
      </Section>

      <Section title="Empty and error states">
        <EmptyState
          className="flex-1"
          icon={Link2}
          title="No payments yet"
          description="Create your first payment request to get a link."
          action={<Button size="sm">Create your first payment request</Button>}
        />
        <ErrorState
          className="flex-1"
          title="Something went wrong"
          description="We couldn't load this page. Please try again."
          action={<Button size="sm">Retry</Button>}
        />
      </Section>

      <Section title="Motion">
        <Stagger className="grid w-full grid-cols-4 gap-3">
          {["Create", "Share", "Customer pays", "Payment verified"].map(
            (step) => (
              <StaggerItem
                key={step}
                className="rounded-xl bg-canvas p-4 text-sm"
              >
                {step}
              </StaggerItem>
            ),
          )}
        </Stagger>
        <Reveal className="w-full">
          <SplitHeading className="text-3xl tracking-[-0.02em]">
            A payment is marked paid only after Stellar confirms it.
          </SplitHeading>
        </Reveal>
      </Section>
    </main>
  );
}
