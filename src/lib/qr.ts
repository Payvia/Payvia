import type { Payment } from "@/lib/api/schemas";

/** File name for a downloaded QR code: "payvia-INV-00124.png". */
export function qrFileName(payment: Pick<Payment, "reference" | "payment_id">) {
  const name = (payment.reference ?? payment.payment_id)
    .replace(/[^A-Za-z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `payvia-${name || payment.payment_id}.png`;
}

export function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) =>
        blob ? resolve(blob) : reject(new Error("Could not render QR code.")),
      "image/png",
    );
  });
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  // Give the browser a moment to start the download before releasing it.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
