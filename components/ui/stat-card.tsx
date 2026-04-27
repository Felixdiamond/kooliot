"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils";
import { GlassCard } from "@/components/ui/glass-card";

type StatTrend = {
  value: number;
  label?: string;
};

type StatCardProps = {
  title: string;
  value: string | number;
  icon?: ReactNode;
  trend?: StatTrend;
  className?: string;
};

export function StatCard({ title, value, icon, trend, className }: StatCardProps) {
  const trendTone = trend && trend.value < 0 ? "text-rose-600 dark:text-rose-300" : "text-emerald-700 dark:text-emerald-300";
  const trendPrefix = trend && trend.value > 0 ? "+" : "";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      whileHover={{ y: -2 }}
      className="group"
    >
      <GlassCard
        className={cn(
          "relative overflow-hidden p-5",
          "before:absolute before:inset-0 before:-z-10 before:opacity-0",
          "before:bg-radial-[at_20%_0%] before:from-cyan-200/40 before:to-transparent before:transition-opacity",
          "group-hover:before:opacity-100",
          className
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{title}</p>
          {icon ? <span className="text-cyan-700 dark:text-cyan-300">{icon}</span> : null}
        </div>

        <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">{value}</p>

        {trend ? (
          <p className={cn("mt-2 text-sm font-medium", trendTone)}>
            {trendPrefix}
            {trend.value}%
            {trend.label ? ` ${trend.label}` : ""}
          </p>
        ) : null}
      </GlassCard>
    </motion.div>
  );
}