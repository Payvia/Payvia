import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { env } from "@/lib/env";
import { Showcase } from "./showcase";

export const metadata: Metadata = {
  title: "Components",
  robots: { index: false },
};

// Reference page for the design system. Hidden once the app talks to the
// real backend; available in development and in mock-mode builds.
export default function ComponentsPage() {
  if (process.env.NODE_ENV === "production" && env.apiMode !== "mock") {
    notFound();
  }
  return <Showcase />;
}
