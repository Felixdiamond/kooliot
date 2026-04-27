"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function DashboardAutoRefresh() {
  const router = useRouter();
  const [isRefreshing, startTransition] = useTransition();
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      startTransition(() => {
        router.refresh();
        setLastRefresh(new Date());
      });
    }, 60_000);

    return () => clearInterval(timer);
  }, [router]);

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-3 py-1.5 text-xs text-slate-800 backdrop-blur-lg dark:text-slate-200">
      <span
        className={isRefreshing ? "h-2 w-2 animate-pulse rounded-full bg-cyan-500" : "h-2 w-2 rounded-full bg-emerald-500"}
      />
      {isRefreshing ? "Refreshing..." : `Last refresh ${lastRefresh.toLocaleTimeString()}`}
    </div>
  );
}