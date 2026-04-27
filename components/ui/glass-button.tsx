"use client";

import { motion } from "framer-motion";
import type { HTMLMotionProps } from "framer-motion";

import { cn } from "@/lib/utils";

type GlassButtonVariant = "primary" | "secondary" | "danger";

type GlassButtonProps = HTMLMotionProps<"button"> & {
  variant?: GlassButtonVariant;
};

const VARIANT_CLASSNAME: Record<GlassButtonVariant, string> = {
  primary: "border border-primary bg-primary text-primary-foreground hover:bg-primary/90",
  secondary: "border border-border bg-card text-foreground hover:border-primary/35 hover:bg-primary/8",
  danger: "border border-status-error bg-status-error text-white hover:bg-status-error/90",
};

export function GlassButton({ className, variant = "primary", ...props }: GlassButtonProps) {
  return (
    <motion.button
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        "inline-flex h-10 cursor-pointer items-center justify-center rounded-md px-4 text-sm font-semibold",
        "shadow-sm transition duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
        VARIANT_CLASSNAME[variant],
        className
      )}
      {...props}
    />
  );
}