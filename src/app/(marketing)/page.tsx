import type { Metadata } from "next";
import { Cta } from "@/components/marketing/cta";
import { Footer } from "@/components/marketing/footer";
import { Hero } from "@/components/marketing/hero";
import { HowItWorks } from "@/components/marketing/how-it-works";
import { UseCases } from "@/components/marketing/use-cases";
import { Verification } from "@/components/marketing/verification";
import { SiteJsonLd } from "@/components/seo/json-ld";
import { pageMetadata } from "@/lib/seo";
import { routes } from "@/lib/routes";

export const metadata: Metadata = pageMetadata({ path: routes.home });

export default function LandingPage() {
  return (
    <>
      <SiteJsonLd />
      <main className="overflow-x-clip">
        <Hero />
        <HowItWorks />
        <UseCases />
        <Verification />
        <Cta />
      </main>
      <Footer />
    </>
  );
}
