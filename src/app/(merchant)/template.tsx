import { PageTransition } from "@/components/motion/page-transition";

export default function MerchantTemplate({ children }: LayoutProps<"/">) {
  return <PageTransition>{children}</PageTransition>;
}
