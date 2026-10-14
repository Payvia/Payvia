import Image from "next/image";
import { supportHref } from "@/components/merchant/nav";
import { Wordmark } from "@/components/wordmark";

export default function AuthLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-dvh flex-col bg-[#fafafa]">
      <header className="flex items-center justify-between px-5 py-5 md:px-8">
        <Wordmark />
        <a href={supportHref} className="text-xs hover:underline">
          Support
        </a>
      </header>
      <main className="mx-auto grid w-full max-w-5xl flex-1 items-center gap-10 px-5 pb-16 md:px-8 lg:grid-cols-[minmax(0,26rem)_1fr]">
        <div className="mx-auto w-full max-w-[26rem]">{children}</div>
        <Image
          src="/illustrations/auth-keypad.svg"
          alt=""
          width={461}
          height={493}
          priority
          unoptimized
          className="mx-auto hidden w-full max-w-md lg:block"
        />
      </main>
    </div>
  );
}
