import Link from "next/link";
import { routes } from "@/lib/routes";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-canvas p-6">
      <div className="w-full max-w-sm rounded-card border border-line bg-surface p-6">
        <h1 className="text-lg">Page not found</h1>
        <p className="mt-1 text-sm text-muted">
          The page you are looking for does not exist or has moved.
        </p>
        <Link
          href={routes.home}
          className="mt-5 inline-flex rounded-lg bg-ink px-4 py-2 text-sm text-white"
        >
          Back to PayVia
        </Link>
      </div>
    </main>
  );
}
