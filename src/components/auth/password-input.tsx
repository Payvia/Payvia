"use client";

import { Eye, EyeOff } from "lucide-react";
import { useState, type ComponentProps } from "react";
import { IconButton } from "@/components/ui/icon-button";
import { Input } from "@/components/ui/input";

export function PasswordInput(
  props: Omit<ComponentProps<typeof Input>, "type">,
) {
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOff : Eye;
  return (
    <Input
      {...props}
      type={visible ? "text" : "password"}
      trailing={
        <IconButton
          size="sm"
          label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          onClick={() => setVisible((v) => !v)}
        >
          <Icon />
        </IconButton>
      }
    />
  );
}
