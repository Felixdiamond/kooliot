import { desc, eq } from "drizzle-orm";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Cpu, KeyRound, RefreshCw, Sparkles } from "lucide-react";

import { TokenControlPanel } from "@/components/tokens/TokenControlPanel";
import { TokenHistory } from "@/components/tokens/TokenHistory";
import { PageHeader } from "@/components/shared/PageHeader";
import { StickerCard } from "@/components/ui/sticker-card";
import { Button } from "@/components/ui/Button";
import { db } from "@/db/client";
import { tokenLedger } from "@/db/schema";
import { formatBoardTypeLabel } from "@/lib/domain/boards";
import { listUserDevices } from "@/lib/services/accessControl";

export default async function TokensPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const requestHeaders = await headers();
  const userId = Number(requestHeaders.get("x-user-id"));
  const userRole = requestHeaders.get("x-user-role") ?? "VIEWER";

  if (!Number.isInteger(userId) || userId <= 0) {
    redirect("/login");
  }

  const devices = await listUserDevices(userId);
  const params = await searchParams;

  const identifier = typeof params.identifier === "string" ? params.identifier.trim() : "";
  const selectedDeviceIdRaw = typeof params.deviceId === "string" ? Number(params.deviceId) : NaN;
  const normalizedIdentifier = identifier.toLowerCase();
  const compactIdentifier = normalizedIdentifier.replace(/\s+/g, "");
  const selectedByIdentifier = identifier
    ? devices.find((device) => {
        const candidates = [device.serialNumber, device.angazaId, device.paygoId]
          .map((value) => (value ? String(value).trim().toLowerCase() : ""))
          .filter(Boolean)
          .flatMap((value) => [value, value.replace(/\s+/g, "")]);
        return candidates.includes(normalizedIdentifier) || candidates.includes(compactIdentifier);
      })
    : null;
  const selectedDevice =
    selectedByIdentifier ?? devices.find((device) => device.id === selectedDeviceIdRaw) ?? devices[0] ?? null;

  if (!selectedDevice) {
    return (
      <div>
        <PageHeader
          title="Token Studio"
          subtitle="Generate OpenPAYGO tokens for your managed devices"
        />

        <div className="surface-elevated p-10 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-lg border border-tertiary/35 bg-tertiary/16 text-foreground">
            <Cpu size={24} strokeWidth={2.25} />
          </div>
          <h2 className="font-heading mt-5 text-2xl font-semibold text-foreground">
            No Devices Available
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Register or import a device first, then generate PAYG tokens here.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link href="/devices/register" className="inline-flex items-center justify-center">
              <Button variant="primary" size="md">Register Device</Button>
            </Link>
            <Link href="/dashboard" className="inline-flex items-center justify-center">
              <Button variant="secondary" size="md">Back to Dashboard</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const rawRecords = await db
    .select({
      id: tokenLedger.id,
      tokenType: tokenLedger.tokenType,
      value: tokenLedger.value,
      token: tokenLedger.token,
      generatedAt: tokenLedger.generatedAt,
      generatedBy: tokenLedger.generatedBy,
    })
    .from(tokenLedger)
    .where(eq(tokenLedger.deviceId, selectedDevice.id))
    .orderBy(desc(tokenLedger.generatedAt))
    .limit(30);

  const records = rawRecords.map((record) => ({
    ...record,
    generatedAt: record.generatedAt.toISOString(),
  }));

  const now = new Date();
  const generatedIn24h = records.filter(
    (record) => now.getTime() - new Date(record.generatedAt).getTime() <= 24 * 60 * 60 * 1000
  ).length;
  const latestGeneratedAt = records[0]?.generatedAt
    ? new Date(records[0].generatedAt).toLocaleString()
    : "Never";

  return (
    <div>
      <PageHeader
        title="Token Studio"
        subtitle="Generate and track OpenPAYGO activation tokens"
        actions={
          <Link href={`/tokens?deviceId=${selectedDevice.id}`}>
            <Button variant="secondary" size="md">
              <RefreshCw size={16} strokeWidth={2.5} className="mr-2" />
              Refresh
            </Button>
          </Link>
        }
      />

      <form action="/tokens" method="get" className="surface-card mb-8 p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 md:items-end">
          <div>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Lookup by ID
            </label>
            <input
              name="identifier"
              defaultValue={identifier}
              placeholder="PayGo ID, Angaza ID, or serial"
              className="h-10 w-full rounded-md border border-border bg-input px-3 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
            />
          </div>
          <div className="md:col-span-2">
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Select Device
            </label>
            <select
              name="deviceId"
              defaultValue={String(selectedDevice.id)}
              className="h-10 w-full rounded-md border border-border bg-input px-3 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
            >
              {devices.map((device) => (
                <option key={device.id} value={device.id}>
                  {device.serialNumber} ({formatBoardTypeLabel(device.boardType)})
                </option>
              ))}
            </select>
          </div>
          <Button type="submit" variant="primary" size="md">
            Load Device
          </Button>
        </div>
        {identifier && !selectedByIdentifier ? (
          <p className="mt-3 text-xs font-medium text-status-error">
            No device matched identifier &quot;{identifier}&quot; in your accessible fleet.
          </p>
        ) : null}
      </form>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <StickerCard
          shadowColor="tertiary"
          icon={<KeyRound size={20} strokeWidth={2.5} />}
        >
          <div className="pt-4">
            <div className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-2">
              Tokens Recorded
            </div>
            <div className="text-5xl font-heading font-bold text-foreground">{records.length}</div>
          </div>
        </StickerCard>

        <StickerCard
          shadowColor="quaternary"
          icon={<Sparkles size={20} strokeWidth={2.5} />}
        >
          <div className="pt-4">
            <div className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-2">
              Generated (24h)
            </div>
            <div className="text-5xl font-heading font-bold text-foreground">{generatedIn24h}</div>
          </div>
        </StickerCard>

        <StickerCard
          shadowColor="secondary"
          icon={<Cpu size={20} strokeWidth={2.5} />}
        >
          <div className="pt-4">
            <div className="text-xs uppercase tracking-widest text-muted-foreground font-bold mb-2">
              Device Counter
            </div>
            <div className="text-3xl font-heading font-bold text-foreground">{selectedDevice.tokenCount}</div>
            <div className="mt-1 text-xs text-muted-foreground font-medium">
              Last token: {latestGeneratedAt}
            </div>
          </div>
        </StickerCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <TokenControlPanel deviceId={selectedDevice.id} isViewer={userRole === "VIEWER"} />
        </div>
        <div className="lg:col-span-2">
          <TokenHistory records={records} />
        </div>
      </div>
    </div>
  );
}
