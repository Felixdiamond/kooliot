import { AlertTriangle, CheckCircle2, Clock3 } from "lucide-react";

import { cn } from "@/lib/utils";

type AlertLevel = "critical" | "warning" | "normal";

type AlertBadgeProps = {
  batteryVoltage?: number | null;
  temperatureC?: number | null;
  lastTelemetryAt?: Date | string | null;
  className?: string;
};

function resolveAlertLevel({
  batteryVoltage,
  temperatureC,
  lastTelemetryAt,
}: Omit<AlertBadgeProps, "className">): { level: AlertLevel; text: string } {
  const lastSeenTime =
    lastTelemetryAt instanceof Date
      ? lastTelemetryAt.getTime()
      : typeof lastTelemetryAt === "string"
        ? new Date(lastTelemetryAt).getTime()
        : null;

  const offlineFor24h =
    typeof lastSeenTime === "number" && Number.isFinite(lastSeenTime)
      ? Date.now() - lastSeenTime > 24 * 60 * 60 * 1000
      : false;

  if ((batteryVoltage ?? Infinity) < 20 || (temperatureC ?? -Infinity) > 50 || offlineFor24h) {
    if ((batteryVoltage ?? Infinity) < 20) {
      return { level: "critical", text: "Critical: low battery" };
    }

    if ((temperatureC ?? -Infinity) > 50) {
      return { level: "critical", text: "Critical: high temperature" };
    }

    return { level: "warning", text: "Warning: device offline > 24h" };
  }

  return { level: "normal", text: "Normal" };
}

export function AlertBadge({ batteryVoltage, temperatureC, lastTelemetryAt, className }: AlertBadgeProps) {
  const { level, text } = resolveAlertLevel({ batteryVoltage, temperatureC, lastTelemetryAt });

  const palette =
    level === "critical"
      ? "border-rose-300/60 bg-rose-500/20 text-rose-900 dark:text-rose-100"
      : level === "warning"
        ? "border-amber-300/60 bg-amber-500/20 text-amber-900 dark:text-amber-100"
        : "border-emerald-300/60 bg-emerald-500/20 text-emerald-900 dark:text-emerald-100";

  const icon =
    level === "critical" ? (
      <AlertTriangle className="h-3.5 w-3.5" />
    ) : level === "warning" ? (
      <Clock3 className="h-3.5 w-3.5" />
    ) : (
      <CheckCircle2 className="h-3.5 w-3.5" />
    );

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        "backdrop-blur-lg",
        palette,
        className
      )}
    >
      {icon}
      {text}
    </span>
  );
}