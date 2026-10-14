import type { ReactNode } from "react";
import { Card } from "@/components/ui/card";

export function AuthCard({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card className="p-5 md:p-6">
      <h1 className="text-xl tracking-tight">{title}</h1>
      <p className="mt-1 text-xs text-muted">{description}</p>
      <div className="mt-6">{children}</div>
    </Card>
  );
}
