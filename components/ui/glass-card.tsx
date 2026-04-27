import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type GlassCardProps = HTMLAttributes<HTMLDivElement>;

export function GlassCard({ className, ...props }: GlassCardProps) {
  return (
    <div
      className={cn(
        "surface-card rounded-xl p-6",
        className
      )}
      {...props}
    />
  );
}
