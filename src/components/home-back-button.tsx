"use client";

import { Button } from "@/components/ui/button";
import { appPath } from "@/lib/paths";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

export function HomeBackButton({
  className,
  size = "sm",
  variant = "outline",
  label = "หน้าแรก",
  onClick,
}: {
  className?: string;
  size?: "sm" | "default";
  variant?: "outline" | "default" | "ghost";
  label?: string;
  /** If provided, runs instead of navigating to `/` (for in-app library view). */
  onClick?: () => void;
}) {
  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      className={cn(className)}
      onClick={() => {
        if (onClick) {
          onClick();
          return;
        }
        window.location.assign(appPath("/"));
      }}
    >
      <ArrowLeft data-icon="inline-start" />
      {label}
    </Button>
  );
}
