"use client";

import { ChevronDown } from "lucide-react";
import Image, { type StaticImageData } from "next/image";
import { QRCodeSVG } from "qrcode.react";
import { useRef, type ReactNode } from "react";
import { Reveal } from "@/components/motion/reveal";
import { SplitHeading } from "@/components/motion/split-heading";
import { gsap, media, useGSAP } from "@/lib/motion/gsap";
import hills from "../../../public/images/hills.jpg";
import tree from "../../../public/images/tree.jpg";
import valley from "../../../public/images/valley.jpg";
import { SectionLabel } from "./section-label";

function StepLabel({
  n,
  title,
  text,
}: {
  n: number;
  title: string;
  text: string;
}) {
  return (
    <div className="flex gap-3">
      <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-line text-[10px] text-muted">
        {n}
      </span>
      <div>
        <p className="text-sm">{title}</p>
        <p className="text-[11px] text-muted">{text}</p>
      </div>
    </div>
  );
}

function CreateUi() {
  return (
    <div className="h-full border-l border-dashed border-black/10 bg-surface p-4 pl-3">
      <StepLabel
        n={2}
        title="Choose asset"
        text="Select the currency you want to receive."
      />
      <div className="mt-3 ml-8 flex h-11 items-center justify-between rounded-xl bg-field px-4 text-sm text-muted">
        <span data-typed>Select asset</span>
        <ChevronDown className="size-4" />
      </div>
      <div className="mt-5">
        <StepLabel
          n={3}
          title="Description"
          text="Tell your customer what the payment is for."
        />
      </div>
      <div className="mt-3 ml-8 flex h-28 items-center justify-center rounded-xl bg-field text-xs text-muted">
        Select an asset first.
      </div>
    </div>
  );
}

function ShareUi() {
  return (
    <div className="h-full border-l border-black/10 bg-surface p-4">
      <p className="rounded-xl bg-brand-soft p-3 text-[11px] leading-snug text-brand-ink">
        Share this link or QR code with your customer. The payment is verified
        on Stellar before it is marked Paid.
      </p>
      <div className="mt-4 flex justify-center rounded-2xl border border-line bg-canvas p-5">
        <QRCodeSVG
          value="https://payvia.app/pay/8Xk92Lm"
          size={150}
          level="M"
          className="bg-surface p-2"
        />
      </div>
    </div>
  );
}

function PayUi() {
  const rows = [
    ["Merchant", "ABC Digital"],
    ["Amount", "150.00 USDC"],
    ["Reference", "INV-00124"],
    ["Date", "08 Oct 2026, 20:24 UTC"],
  ];
  return (
    <div className="relative h-full overflow-hidden bg-success">
      <span className="absolute -top-10 right-8 size-28 rotate-45 rounded-[2rem] bg-[#a6e600]" />
      <div className="absolute inset-x-0 top-14 bottom-0 rounded-tl-sheet bg-surface p-5">
        <p className="text-sm">Review Payment</p>
        <p className="text-[10px] text-muted">PV-2026-00124</p>
        <dl className="mt-2 divide-y divide-line text-[11px]">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between py-2.5">
              <dt className="text-muted">{label}</dt>
              <dd className="font-medium">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </div>
  );
}

function VerifiedUi() {
  return (
    <div className="h-full overflow-hidden rounded-tl-2xl bg-surface">
      <p className="bg-canvas px-4 py-2 text-[11px] font-medium">05:31</p>
      <div className="p-4">
        <p className="text-base tracking-tight">PayVia</p>
        <p className="mt-4 text-sm">Payments details</p>
        <div className="mt-3 rounded-panel border border-line p-3">
          <div data-paid className="rounded-lg bg-info-soft p-3 text-info-ink">
            <p className="text-xs">Paid</p>
            <p className="text-[10px]">Payment received successfully.</p>
          </div>
          <p className="mt-3 text-xs">Website Design</p>
          <p className="text-[10px] text-muted">
            INV-00124 · Created Oct 8, 2026
          </p>
        </div>
      </div>
    </div>
  );
}

type Step = {
  title: string;
  text: string;
  photo: StaticImageData;
  ui: ReactNode;
  /** How far in from the left the product UI starts, leaving the photo visible. */
  inset: string;
};

const steps: Step[] = [
  {
    title: "Create",
    text: "Enter an amount and a description. PayVia generates a unique payment link.",
    photo: tree,
    ui: <CreateUi />,
    inset: "left-[17%]",
  },
  {
    title: "Share",
    text: "Send the link or QR code through WhatsApp, email, SMS, or social media.",
    photo: hills,
    ui: <ShareUi />,
    inset: "left-[14%]",
  },
  {
    title: "Customer pays",
    text: "Your customer reviews the request, connects a Stellar wallet, and approves.",
    photo: valley,
    ui: <PayUi />,
    inset: "left-[11%]",
  },
  {
    title: "Payment verified",
    text: "PayVia checks the payment on Stellar and updates your dashboard.",
    photo: hills,
    ui: <VerifiedUi />,
    inset: "left-[8%] top-6",
  },
];

export function HowItWorks() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add(media.motionOk, () => {
        const cards = gsap.utils.toArray<HTMLElement>("[data-step]");

        // Cards rise in one after another as the row enters.
        gsap.from(cards, {
          y: 60,
          opacity: 0,
          duration: 1,
          stagger: 0.12,
          scrollTrigger: {
            trigger: "[data-steps]",
            start: "top 80%",
            once: true,
          },
        });

        // The line under the row fills as the reader moves through the steps:
        // Create → Share → Customer pays → Payment verified.
        gsap.fromTo(
          "[data-progress]",
          { scaleX: 0 },
          {
            scaleX: 1,
            ease: "none",
            scrollTrigger: {
              trigger: "[data-steps]",
              start: "top 75%",
              end: "bottom 55%",
              scrub: 0.6,
            },
          },
        );

        // Inside each card the product UI slides in over its photograph, and
        // the photograph drifts the other way.
        cards.forEach((card) => {
          const trigger = {
            trigger: card,
            start: "top 85%",
            end: "bottom 30%",
            scrub: 0.8,
          };
          gsap.fromTo(
            card.querySelector("[data-step-ui]"),
            { xPercent: 14 },
            { xPercent: 0, ease: "none", scrollTrigger: trigger },
          );
          gsap.fromTo(
            card.querySelector("[data-step-photo]"),
            { scale: 1.25 },
            { scale: 1.05, ease: "none", scrollTrigger: trigger },
          );
        });
      });
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      id="how-it-works"
      className="mx-auto max-w-[90rem] scroll-mt-8 px-4 py-16 md:px-10 md:py-24"
    >
      <div className="grid gap-6 md:grid-cols-[2fr_3fr]">
        <div>
          <SectionLabel>How it works</SectionLabel>
        </div>
        <div>
          <SplitHeading className="max-w-3xl text-3xl leading-[1.05] tracking-[-0.02em] md:text-5xl">
            Create a link. Share it anywhere. Get paid on Stellar.
          </SplitHeading>
          <Reveal delay={0.15}>
            <p className="mt-4 max-w-lg text-sm text-muted md:text-base">
              PayVia hides the technical complexity of blockchain payments.
              Merchants never need to explain wallet addresses or explorers.
            </p>
          </Reveal>
        </div>
      </div>

      <ol
        data-steps
        className="mt-10 grid gap-4 md:mt-16 md:grid-cols-2 xl:grid-cols-4"
      >
        {steps.map((step) => (
          <li
            key={step.title}
            data-step
            className="overflow-hidden rounded-2xl bg-canvas"
          >
            <div
              aria-hidden
              className="relative h-64 overflow-hidden rounded-t-2xl"
            >
              <Image
                data-step-photo
                src={step.photo}
                alt=""
                fill
                placeholder="blur"
                sizes="(min-width: 1280px) 25vw, (min-width: 768px) 50vw, 100vw"
                className="object-cover"
              />
              <div
                data-step-ui
                className={`absolute right-0 bottom-0 ${step.inset} ${step.inset.includes("top-") ? "" : "top-0"}`}
              >
                {step.ui}
              </div>
            </div>
            <div className="p-6 md:p-7">
              <h3 className="text-xl tracking-tight md:text-2xl">
                {step.title}
              </h3>
              <p className="mt-2 text-sm text-muted">{step.text}</p>
            </div>
          </li>
        ))}
      </ol>
      <div
        aria-hidden
        className="mt-6 hidden h-px overflow-hidden bg-line md:block"
      >
        <div data-progress className="h-full origin-left bg-brand" />
      </div>
    </section>
  );
}
