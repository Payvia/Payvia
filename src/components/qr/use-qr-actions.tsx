"use client";

import { QRCodeCanvas } from "qrcode.react";
import { useRef } from "react";
import { toast } from "sonner";
import type { Payment } from "@/lib/api/schemas";
import { canvasToBlob, downloadBlob, qrFileName } from "@/lib/qr";
import { shareMessage } from "@/lib/share";

const EXPORT_SIZE = 1024;

/**
 * Download and share for a payment's QR code. Render `exportCanvas` somewhere
 * in the tree: it is an off-screen, print-resolution copy of the code.
 */
export function useQrActions(payment: Payment, merchantName: string) {
  const ref = useRef<HTMLCanvasElement>(null);

  async function image() {
    if (!ref.current) throw new Error("QR code is not ready.");
    return canvasToBlob(ref.current);
  }

  async function download() {
    try {
      downloadBlob(await image(), qrFileName(payment));
      toast.success("QR code downloaded");
    } catch {
      toast.error("Could not download the QR code");
    }
  }

  async function share() {
    const text = shareMessage(payment, merchantName);
    const title = `Payment request from ${merchantName}`;
    try {
      const file = new File([await image()], qrFileName(payment), {
        type: "image/png",
      });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ title, text, files: [file] });
        return;
      }
      if (navigator.share) {
        await navigator.share({ title, text, url: payment.payment_url });
        return;
      }
      // No share sheet (most desktop browsers): copy the message instead.
      await navigator.clipboard.writeText(text);
      toast.success("Copied payment link and message");
    } catch (error) {
      // Closing the share sheet is not a failure.
      if (error instanceof DOMException && error.name === "AbortError") return;
      toast.error("Could not share this payment request");
    }
  }

  const exportCanvas = (
    <QRCodeCanvas
      ref={ref}
      value={payment.payment_url}
      size={EXPORT_SIZE}
      level="M"
      marginSize={4}
      aria-hidden
      className="hidden"
    />
  );

  return { download, share, exportCanvas };
}
