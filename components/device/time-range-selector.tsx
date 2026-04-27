"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { GlassSelect } from "@/components/ui/glass-select";

type TimeRangeSelectorProps = {
  currentRange: string;
};

export function TimeRangeSelector({ currentRange }: TimeRangeSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function onRangeChange(nextRange: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("range", nextRange);
    if (nextRange !== "custom") {
      params.delete("start");
      params.delete("end");
    }

    startTransition(() => {
      router.replace(`${pathname}?${params.toString()}`);
    });
  }

  return (
    <div className="w-full max-w-xs">
      <GlassSelect
        aria-label="Select telemetry time range"
        value={currentRange}
        onChange={(event) => onRangeChange(event.target.value)}
        disabled={isPending}
      >
        <option value="24h">Last 24 Hours</option>
        <option value="7d">Last 7 Days</option>
        <option value="30d">Last 30 Days</option>
        <option value="custom">Custom Range</option>
      </GlassSelect>
    </div>
  );
}