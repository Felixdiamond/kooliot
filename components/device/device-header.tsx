import { AlertBadge } from "@/components/ui/alert-badge";
import { GlassCard } from "@/components/ui/glass-card";

type DeviceHeaderProps = {
  serialNumber: string;
  boardType: string;
  status: string;
  lastTelemetryAt: Date | null;
  batteryVoltage?: number | null;
  temperatureC?: number | null;
};

export function DeviceHeader({
  serialNumber,
  boardType,
  status,
  lastTelemetryAt,
  batteryVoltage,
  temperatureC,
}: DeviceHeaderProps) {
  return (
    <GlassCard className="p-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-cyan-700 dark:text-cyan-300">
            Device Detail
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
            {serialNumber}
          </h1>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-full border border-cyan-300/50 bg-cyan-500/15 px-2 py-0.5 text-cyan-900 dark:text-cyan-200">
              {boardType}
            </span>
            <span className="rounded-full border border-white/30 bg-white/20 px-2 py-0.5 capitalize text-slate-800 dark:text-slate-200">
              {status}
            </span>
          </div>

          <p className="mt-3 text-sm text-slate-700 dark:text-slate-300">
            Last telemetry: {lastTelemetryAt ? lastTelemetryAt.toLocaleString() : "No telemetry yet"}
          </p>
        </div>

        <AlertBadge
          batteryVoltage={batteryVoltage}
          temperatureC={temperatureC}
          lastTelemetryAt={lastTelemetryAt}
        />
      </div>
    </GlassCard>
  );
}