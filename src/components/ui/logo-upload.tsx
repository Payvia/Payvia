"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { Button } from "./button";

const MAX_BYTES = 200 * 1024;
const ACCEPT = "image/png,image/jpeg,image/webp,image/svg+xml";

type LogoUploadProps = {
  value: string | null;
  onChange: (value: string | null) => void;
  label?: string;
};

/**
 * Picks a logo and hands it back as a data URL. Small images only: the real
 * backend should replace this with a proper file upload.
 */
export function LogoUpload({
  value,
  onChange,
  label = "Merchant logo",
}: LogoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string>();

  function onFile(file: File | undefined) {
    if (!file) return;
    if (!ACCEPT.split(",").includes(file.type)) {
      setError("Use a PNG, JPG, WebP or SVG image.");
      return;
    }
    if (file.size > MAX_BYTES) {
      setError("Use an image smaller than 200 KB.");
      return;
    }
    setError(undefined);
    const reader = new FileReader();
    reader.onload = () => onChange(String(reader.result));
    reader.onerror = () => setError("Could not read that file.");
    reader.readAsDataURL(file);
  }

  return (
    <div className="flex flex-col gap-2">
      <span className="text-xs">{label}</span>
      <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-line bg-field text-xs text-muted">
        {value ? (
          <Image
            src={value}
            alt="Merchant logo preview"
            width={64}
            height={64}
            unoptimized
            className="size-16 rounded-full object-cover"
          />
        ) : (
          "No logo uploaded."
        )}
      </div>
      {error ? (
        <p role="alert" className="text-xs text-danger-ink">
          {error}
        </p>
      ) : null}
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
        >
          {value ? "Replace logo" : "Upload logo"}
        </Button>
        {value ? (
          <Button variant="ghost" size="sm" onClick={() => onChange(null)}>
            Remove
          </Button>
        ) : null}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        aria-label={label}
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          onFile(event.target.files?.[0]);
          event.target.value = "";
        }}
      />
    </div>
  );
}
