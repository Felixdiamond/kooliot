import { GlassCard } from "@/components/ui/glass-card";

export function NoDataState() {
  return (
    <GlassCard className="p-8 text-center">
      <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">No data available</h3>
      <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
        No telemetry was found for this device in the selected window.
      </p>
      <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
        Verify the device is active, then trigger ingestion and try a wider time range.
      </p>
    </GlassCard>
  );
}