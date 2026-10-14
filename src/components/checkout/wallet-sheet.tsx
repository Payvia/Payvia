"use client";

import {
  ChevronRight,
  FlaskConical,
  Globe,
  LoaderCircle,
  Smartphone,
  TriangleAlert,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { Badge } from "@/components/ui/badge";
import { Sheet } from "@/components/ui/dialog";
import { FREIGHTER_INSTALL_URL } from "@/lib/stellar/freighter";
import type { WalletId } from "@/lib/stellar/wallet";
import { demoWalletEnabled, type Checkout } from "./use-checkout";

function Option({
  icon: Icon,
  name,
  description,
  busy,
  disabled,
  onSelect,
  children,
}: {
  icon: LucideIcon;
  name: string;
  description: string;
  busy?: boolean;
  disabled?: boolean;
  onSelect: () => void;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-xl bg-field">
      <button
        type="button"
        onClick={onSelect}
        disabled={disabled}
        className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition-colors hover:bg-black/5 disabled:pointer-events-none disabled:opacity-50"
      >
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-line">
          <Icon className="size-[18px]" strokeWidth={1.75} aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm">{name}</span>
          <span className="block text-xs text-muted">{description}</span>
        </span>
        {busy ? (
          <LoaderCircle
            className="size-4 animate-spin"
            aria-label="Connecting"
          />
        ) : (
          <ChevronRight className="size-4" aria-hidden />
        )}
      </button>
      {children}
    </div>
  );
}

function Alert({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div
      role="alert"
      className="flex items-center gap-3 rounded-xl bg-danger-soft p-3"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-danger text-white">
        <TriangleAlert className="size-[18px]" aria-hidden />
      </span>
      <span>
        <span className="block text-sm text-danger-ink">{title}</span>
        <span className="block text-xs text-muted">{children}</span>
      </span>
    </div>
  );
}

export function WalletSheet({ checkout }: { checkout: Checkout }) {
  const { sheet } = checkout.state;
  const busy = Boolean(sheet.connecting);
  const connecting = (id: WalletId) => sheet.connecting === id;
  const freighterMissing =
    sheet.issue === "not_installed" && sheet.issueWallet === "freighter";

  return (
    <Sheet
      open={sheet.open}
      onOpenChange={(open) => {
        if (!open && !busy) checkout.closeWallets();
      }}
      title="Connect a wallet"
      className="text-center"
    >
      <div className="flex flex-col gap-3 text-left">
        {sheet.issue === "rejected" ? (
          <Alert title="Connection rejected">
            You rejected the connection in your wallet. Try connecting again.
          </Alert>
        ) : null}

        {sheet.issue === "blocked" ? (
          <Alert title="Pop-up blocked">
            Your browser stopped the wallet window from opening. Allow pop-ups
            for this site, then try again.
          </Alert>
        ) : null}

        <Option
          icon={Wallet}
          name="Freighter"
          description="Browser extension"
          busy={connecting("freighter")}
          disabled={busy}
          onSelect={() => checkout.connect("freighter")}
        >
          {freighterMissing ? (
            <div
              role="alert"
              className="flex items-center justify-between gap-3 px-3 pb-3"
            >
              <Badge tone="danger">Not installed</Badge>
              <a
                href={FREIGHTER_INSTALL_URL}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-brand hover:underline"
              >
                Install Freighter
              </a>
            </div>
          ) : null}
        </Option>

        <Option
          icon={Globe}
          name="Albedo"
          description="Web wallet. No install needed"
          busy={connecting("albedo")}
          disabled={busy}
          onSelect={() => checkout.connect("albedo")}
        />

        <Option
          icon={Smartphone}
          name="Open in wallet app"
          description="On your phone"
          disabled={busy}
          onSelect={checkout.openWalletApp}
        />

        {demoWalletEnabled ? (
          <Option
            icon={FlaskConical}
            name="Demo wallet"
            description="Simulated payment. Mock mode only"
            busy={connecting("demo")}
            disabled={busy}
            onSelect={() => checkout.connect("demo")}
          />
        ) : null}

        <p className="mt-1 text-center text-xs text-muted">
          Please don&apos;t close this screen.
        </p>
      </div>
    </Sheet>
  );
}
