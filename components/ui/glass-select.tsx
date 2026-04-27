import { forwardRef } from "react";
import type { SelectHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type GlassSelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export const GlassSelect = forwardRef<HTMLSelectElement, GlassSelectProps>(function GlassSelect(
  { className, children, ...props },
  ref
) {
  return (
    <select
      ref={ref}
      className={cn(
        "h-10 w-full appearance-none rounded-md border border-border bg-input px-3 py-2",
        "text-sm text-foreground shadow-sm",
        "outline-none transition duration-200 ease-out focus:border-primary focus:ring-2 focus:ring-primary/25",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    >
      {children}
    </select>
  );
});