"use client";

import { QRCodeSVG } from "qrcode.react";
import { cn } from "@/lib/cn";

type QRCodeProps = {
  /** The PayVia payment URL. Never a raw wallet address. */
  value: string;
  size?: number;
  className?: string;
};

export function QRCode({ value, size = 160, className }: QRCodeProps) {
  return (
    <QRCodeSVG
      value={value}
      size={size}
      level="M"
      marginSize={2}
      title="QR code for this payment request"
      className={cn("rounded-lg bg-surface", className)}
    />
  );
}
