import { SmoothScroll } from "@/components/motion/smooth-scroll";

export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return <SmoothScroll>{children}</SmoothScroll>;
}
