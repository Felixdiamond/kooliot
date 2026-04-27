import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Cpu } from "lucide-react";

import { StatusBadge } from "@/components/devices/StatusBadge";
import { TokenControlPanel } from "@/components/tokens/TokenControlPanel";
import { formatBoardTypeLabel } from "@/lib/domain/boards";
import { checkAccess } from "@/lib/services/accessControl";
import { getDeviceById } from "@/lib/services/deviceService";
import { getDeviceActivationSummary } from "@/lib/services/activationService";
import { db } from "@/db/client";
import { activationLogs } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

function humanizeKey(key: string): string {
  return key
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function toDisplayValue(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  if (Array.isArray(value)) {
    return value.map((entry) => toDisplayValue(entry)).filter(Boolean).join(", ");
  }

  try {
    return JSON.stringify(value);
  } catch {
    return null;
  }
}

export default async function DeviceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const requestHeaders = await headers();
  const userId = Number(requestHeaders.get("x-user-id"));
  const userRole = requestHeaders.get("x-user-role") ?? "VIEWER";

  if (!Number.isInteger(userId) || userId <= 0) {
    redirect("/login");
  }

  const resolvedParams = await params;
  const deviceId = Number(resolvedParams.id);

  if (!Number.isInteger(deviceId) || deviceId <= 0) {
    notFound();
  }

  const isAdmin = userRole === "ADMIN" || userRole === "MANAGER";

  // Non-admins must have been explicitly granted access to this device
  if (!isAdmin) {
    const canAccess = await checkAccess(userId, deviceId);
    if (!canAccess) {
      notFound();
    }
  }

  const device = await getDeviceById(deviceId);
  if (!device) {
    notFound();
  }

  const [activationSummary, recentActivations] = await Promise.all([
    getDeviceActivationSummary(deviceId),
    db
      .select({
        id: activationLogs.id,
        days: activationLogs.days,
        tokenGenerated: activationLogs.tokenGenerated,
        generatedBy: activationLogs.generatedBy,
        activatedAt: activationLogs.activatedAt,
      })
      .from(activationLogs)
      .where(eq(activationLogs.deviceId, deviceId))
      .orderBy(desc(activationLogs.activatedAt))
      .limit(20)
  ]);

  const statusBadge = (() => {
    if (!device.status) {
      return null;
    }

    if (device.status === "active") {
      return { status: "active" as const, pulse: true };
    }

    if (device.status === "inactive" || device.status === "offline") {
      return { status: "offline" as const, label: "Inactive", pulse: false };
    }

    if (device.status === "error") {
      return { status: "error" as const, pulse: false };
    }

    if (device.status === "pending") {
      return { status: "pending" as const, pulse: false };
    }

    return { status: "warning" as const, label: device.status, pulse: false };
  })();

  const extraFields = Object.entries(
    (device.extraFields as Record<string, unknown> | null) ?? {}
  )
    .map(([key, value]) => ({ key: humanizeKey(key), value: toDisplayValue(value) }))
    .filter((entry): entry is { key: string; value: string } => Boolean(entry.value));

  const customerMetadata = Object.entries(
    (device.customerMetadata as Record<string, unknown> | null) ?? {}
  )
    .map(([key, value]) => ({ key: humanizeKey(key), value: toDisplayValue(value) }))
    .filter((entry): entry is { key: string; value: string } => Boolean(entry.value));

  return (
    <div>
      <div className="mb-6 flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Link href="/devices" className="hover:text-foreground transition-colors">
          Devices
        </Link>
        <ChevronRight size={16} strokeWidth={2.5} />
        <span className="font-semibold text-foreground">{device.serialNumber}</span>
      </div>

      <div className="surface-card relative mb-8 overflow-hidden p-8">
        <div className="flex flex-col md:flex-row gap-8 items-start justify-between relative z-10">
          <div className="flex items-start gap-5">
            <div className="flex h-14 w-14 items-center justify-center rounded-lg border border-primary/25 bg-primary/12 text-primary">
              <Cpu size={24} strokeWidth={2.25} />
            </div>
            <div>
              <h1 className="font-heading mb-2 text-3xl font-semibold tracking-tight text-foreground">
                {device.serialNumber}
              </h1>
              <div className="flex flex-wrap items-center gap-4 text-sm mt-3">
                {statusBadge ? (
                  <StatusBadge
                    status={statusBadge.status}
                    label={statusBadge.label}
                    pulse={statusBadge.pulse}
                  />
                ) : (
                  <span className="text-muted-foreground font-medium">Status: —</span>
                )}
                <span className="flex items-center gap-2 font-medium text-muted-foreground">
                  <span className="inline-block w-2 h-2 rounded-full bg-border" />
                  Board: <span className="font-semibold text-foreground">{formatBoardTypeLabel(device.boardType)}</span>
                </span>
                <span className="flex items-center gap-2 font-medium text-muted-foreground">
                  <span className="inline-block w-2 h-2 rounded-full bg-border" />
                  Product: <span className="font-semibold text-foreground">{device.productType || "Unknown"}</span>
                </span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-6 mt-4 md:mt-0">
             <div className="text-right">
               <p className="text-sm text-muted-foreground font-medium mb-1">Angaza / Unit ID</p>
                <p className="text-lg font-semibold">{device.angazaId || "—"}</p>
             </div>
             <div className="text-right">
               <p className="text-sm text-muted-foreground font-medium mb-1">PayGo ID</p>
               <p className="text-lg font-semibold">{device.paygoId || "—"}</p>
             </div>
             <div className="text-right">
                <p className="text-sm text-muted-foreground font-medium mb-1">Total Activations</p>
                <p className="text-lg font-semibold">{activationSummary.totalActivations}</p>
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
           <div className="surface-card p-6">
             <h2 className="font-heading mb-4 text-lg font-semibold text-foreground">Customer And Assignment</h2>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
               <div>
                 <p className="text-muted-foreground">Assignment Status</p>
                 <p className="font-bold text-foreground mt-1">{device.assignmentStatus}</p>
               </div>
               {device.customerName ? (
                 <div>
                   <p className="text-muted-foreground">Customer Name</p>
                   <p className="font-bold text-foreground mt-1">{device.customerName}</p>
                 </div>
               ) : null}
               {device.customerPhone ? (
                 <div>
                   <p className="text-muted-foreground">Customer Phone</p>
                   <p className="font-bold text-foreground mt-1">{device.customerPhone}</p>
                 </div>
               ) : null}
               {device.customerEmail ? (
                 <div>
                   <p className="text-muted-foreground">Customer Email</p>
                   <p className="font-bold text-foreground mt-1">{device.customerEmail}</p>
                 </div>
               ) : null}
               {device.customerLocation ? (
                 <div>
                   <p className="text-muted-foreground">Customer Location</p>
                   <p className="font-bold text-foreground mt-1">{device.customerLocation}</p>
                 </div>
               ) : null}
               {device.sourceWorkbook ? (
                 <div>
                   <p className="text-muted-foreground">Source Workbook</p>
                   <p className="font-bold text-foreground mt-1">{device.sourceWorkbook}</p>
                 </div>
               ) : null}
               {device.sourceSheet ? (
                 <div>
                   <p className="text-muted-foreground">Source Sheet</p>
                   <p className="font-bold text-foreground mt-1">{device.sourceSheet}</p>
                 </div>
               ) : null}
             </div>

             {customerMetadata.length > 0 || extraFields.length > 0 ? (
               <div className="mt-6 pt-5 border-t border-border space-y-4">
                 {customerMetadata.length > 0 ? (
                   <div>
                     <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                       Customer Metadata
                     </h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                       {customerMetadata.map((item) => (
                         <div key={`meta-${item.key}`}>
                           <p className="text-muted-foreground">{item.key}</p>
                           <p className="font-medium text-foreground">{item.value}</p>
                         </div>
                       ))}
                     </div>
                   </div>
                 ) : null}

                 {extraFields.length > 0 ? (
                   <div>
                     <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                       Device Extra Fields
                     </h3>
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                       {extraFields.map((item) => (
                         <div key={`extra-${item.key}`}>
                           <p className="text-muted-foreground">{item.key}</p>
                           <p className="font-medium text-foreground">{item.value}</p>
                         </div>
                       ))}
                     </div>
                   </div>
                 ) : null}
               </div>
             ) : null}
           </div>

           <div className="surface-card p-6">
             <h2 className="font-heading mb-4 text-lg font-semibold text-foreground">Activation History</h2>
             {recentActivations.length === 0 ? (
               <div className="rounded-lg border border-dashed border-border p-8 text-center text-muted-foreground">
                 No activations found for this device.
               </div>
             ) : (
               <div className="overflow-x-auto">
                 <table className="w-full text-sm text-left">
                   <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                     <tr>
                       <th className="px-4 py-3 font-medium">Date & Time</th>
                       <th className="px-4 py-3 font-medium">Days Added</th>
                       <th className="px-4 py-3 font-medium">Token Code</th>
                       <th className="px-4 py-3 font-medium">Generated By</th>
                     </tr>
                   </thead>
                   <tbody>
                     {recentActivations.map((log) => (
                       <tr key={log.id} className="border-b border-border/70 transition-colors hover:bg-muted/25">
                         <td className="px-4 py-4 text-foreground">
                           {new Date(log.activatedAt).toLocaleString()}
                         </td>
                         <td className="px-4 py-4 font-semibold text-status-active">
                           +{log.days} days
                         </td>
                         <td className="px-4 py-4 font-mono-data">
                           {log.tokenGenerated}
                         </td>
                         <td className="px-4 py-4 text-muted-foreground">
                           {log.generatedBy}
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             )}
           </div>
        </div>

        <div className="space-y-6">
          <TokenControlPanel deviceId={deviceId} isViewer={userRole === "VIEWER"} />
        </div>
      </div>
    </div>
  );
}
