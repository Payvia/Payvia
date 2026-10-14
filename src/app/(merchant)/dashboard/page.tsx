import type { Metadata } from "next";
import { Dashboard } from "@/components/merchant/dashboard";

// Against the live backend the merchant loads in the browser, so the server
// renders the shell without this page and has nothing here to validate.
export const instant = false;

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <>
      <h1 className="sr-only">Dashboard</h1>
      <Dashboard />
    </>
  );
}
