import Link from "next/link";

import { AlertBadge } from "@/components/ui/alert-badge";
import { GlassButton } from "@/components/ui/glass-button";
import { GlassCard } from "@/components/ui/glass-card";
import { runOnboardingSyncAction } from "@/lib/actions/onboarding";

type DeviceGridItem = {
  id: number;
  serialNumber: string;
  boardType: string;
  status: string;
  lastTelemetryAt: Date | null;
};

type DeviceGridProps = {
  devices: DeviceGridItem[];
  userRole?: string | null;
};

function formatLastSeen(lastTelemetryAt: Date | null): string {
  if (!lastTelemetryAt) {
    return "No telemetry yet";
  }

  return lastTelemetryAt.toLocaleString();
}

export function DeviceGrid({ devices, userRole }: DeviceGridProps) {
  if (devices.length === 0) {
    return (
      <GlassCard className="p-8 text-center">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">No devices assigned</h3>
        <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
          {userRole === "ADMIN"
            ? "Import your existing PAYGO inventory to populate the dashboard."
            : "Ask an administrator to grant access to at least one device."}
        </p>

        {userRole === "ADMIN" ? (
          <form action={runOnboardingSyncAction} className="mt-4 flex flex-wrap items-center justify-center gap-3">
            <GlassButton type="submit">Import Existing PAYGO Devices</GlassButton>
            <Link
              href="/devices/register"
              className="inline-flex items-center justify-center rounded-xl border border-white/30 bg-white/15 px-4 py-2.5 font-medium text-slate-900 shadow-lg backdrop-blur-xl transition duration-200 hover:bg-white/25 dark:bg-slate-700/40 dark:text-slate-100 dark:hover:bg-slate-600/50"
            >
              Register Device Manually
            </Link>
          </form>
        ) : null}
      </GlassCard>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {devices.map((device) => (
        <Link key={device.id} href={`/devices/${device.id}`} className="group">
          <GlassCard className="h-full p-5 transition group-hover:-translate-y-0.5 group-hover:border-cyan-200/60">
            <div className="flex items-center justify-between gap-3">
              <p className="truncate text-base font-semibold tracking-tight text-slate-900 dark:text-slate-100">
                {device.serialNumber}
              </p>
              <span className="rounded-full border border-cyan-300/40 bg-cyan-500/15 px-2 py-0.5 text-xs font-medium text-cyan-900 dark:text-cyan-200">
                {device.boardType}
              </span>
            </div>

            <p className="mt-3 text-sm text-slate-700 dark:text-slate-300">
              Status: <span className="font-medium capitalize">{device.status}</span>
            </p>
            <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">
              Last telemetry: {formatLastSeen(device.lastTelemetryAt)}
            </p>

            <div className="mt-4">
              <AlertBadge lastTelemetryAt={device.lastTelemetryAt} />
            </div>
          </GlassCard>
        </Link>
      ))}
    </div>
  );
}