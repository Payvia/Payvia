"use client";

import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      position="bottom-center"
      toastOptions={{
        unstyled: true,
        classNames: {
          toast:
            "bg-ink text-white rounded-full px-4 h-10 text-xs flex items-center gap-2 shadow-lg shadow-black/10 w-auto mx-auto",
          actionButton:
            "-mr-2 ml-1 h-7 rounded-full bg-white px-3 font-medium text-ink",
        },
      }}
    />
  );
}
