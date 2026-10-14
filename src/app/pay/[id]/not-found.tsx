import { Leaves } from "@/components/checkout/illustrations";
import { Wordmark } from "@/components/wordmark";

// customer-ui/11 Link Not Found
export default function PaymentNotFound() {
  return (
    <div className="min-h-dvh bg-canvas">
      <section className="relative isolate flex min-h-[70dvh] flex-col overflow-hidden bg-brand px-5 pt-5 pb-16 text-white">
        <Leaves className="top-0 -right-16 -z-10 w-72 text-brand-deep md:right-0 md:w-96" />
        <header className="mx-auto w-full max-w-3xl">
          <Wordmark className="text-white" />
        </header>
        <div className="mx-auto mt-auto w-full max-w-3xl">
          <h1 className="max-w-sm text-2xl leading-tight tracking-tight">
            We couldn&apos;t find this payment request
          </h1>
          <p className="mt-3 max-w-xs text-sm opacity-90">
            Check the link or contact the merchant for a valid payment request.
          </p>
        </div>
      </section>
    </div>
  );
}
