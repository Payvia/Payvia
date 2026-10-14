import { connection } from "next/server";
import { cache } from "react";
import { isApiError } from "@/lib/api/errors";
import type { PublicPayment } from "@/lib/api/schemas";
import { publicServerApi } from "@/lib/api/server";

/** The public view of a payment request, or null if the link is unknown. */
export const getPublicPayment = cache(
  async (slug: string): Promise<PublicPayment | null> => {
    // Payment status changes from minute to minute, so this is always read at
    // request time and never baked into a prerendered shell.
    await connection();
    try {
      return await publicServerApi().checkout.get(slug);
    } catch (error) {
      if (isApiError(error) && error.status === 404) return null;
      throw error;
    }
  },
);
