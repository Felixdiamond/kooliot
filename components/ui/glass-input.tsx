import { forwardRef } from "react";
import type { InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type GlassInputProps = InputHTMLAttributes<HTMLInputElement>;

export const GlassInput = forwardRef<HTMLInputElement, GlassInputProps>(function GlassInput(
  { className, ...props },
  ref
) {
  return (
    <input
      ref={ref}
      className={cn(
        "h-10 w-full rounded-md border border-border bg-input px-3 py-2",
        "text-sm text-foreground placeholder:text-muted-foreground shadow-sm",
        "outline-none transition duration-200 ease-out focus:border-primary focus:ring-2 focus:ring-primary/25",
        "disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
});