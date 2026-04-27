import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";

import { and, eq } from "drizzle-orm";

import { db } from "@/db/client";
import { accessGrants, devices } from "@/db/schema";
import { InnovexAPIClient } from "@/lib/clients/innovexClient";
import { env } from "@/lib/env";
import { sanitizeSerialNumber } from "@/lib/security/input";
import type { Role } from "@/lib/types";

type SupportedBoard = "PAYGO" | "CLOUD_SOLAR";

type SyncSummary = {
  created: number;
  existing: number;
  invalid: number;
  grantCreated: number;
  serials: string[];
};

type InnovexImportOptions = {
  includeApi?: boolean;
  csvPaths?: string[];
  grantUserId: number;
  grantRole?: Role;
  grantedBy?: number;
};

type CloudSolarSyncOptions = {
  deviceIds?: string[];
  grantUserId: number;
  grantRole?: Role;
  grantedBy?: number;
};

function normalizeSerial(raw: string): string {
  return sanitizeSerialNumber(String(raw).trim());
}

function secretFromSerial(serial: string): string {
  return createHash("sha256").update(`kooliot:${serial}`).digest("hex");
}

function parseCsvLine(line: string): string[] {
  const columns: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];

    if (char === '"') {
      const next = line[i + 1];
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      columns.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  columns.push(current);
  return columns;
}

async function discoverInnovexCsvPaths(): Promise<string[]> {
  const workspaceRoot = path.resolve(process.cwd(), "..");
  const innovexDir = path.join(workspaceRoot, "innovex");

  try {
    const files = await readdir(innovexDir, { withFileTypes: true });
    return files
      .filter((entry) => entry.isFile() && entry.name.endsWith("_records.csv"))
      .map((entry) => path.join(innovexDir, entry.name));
  } catch {
    return [];
  }
}

async function extractInnovexSerialsFromCsv(csvPath: string): Promise<string[]> {
  const content = await readFile(csvPath, "utf8");
  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    return [];
  }

  const header = parseCsvLine(lines[0]).map((column) => column.trim().toLowerCase());
  const imeiIndex = header.indexOf("imei");

  if (imeiIndex < 0) {
    return [];
  }

  const serials = new Set<string>();

  for (const line of lines.slice(1)) {
    const columns = parseCsvLine(line);
    const serial = normalizeSerial(columns[imeiIndex] ?? "");
    if (serial.length > 0) {
      serials.add(serial);
    }
  }

  return Array.from(serials);
}

async function ensureAccessGrant(
  userId: number,
  deviceId: number,
  role: Role,
  grantedBy: number
): Promise<boolean> {
  const existing = await db.query.accessGrants.findFirst({
    where: and(eq(accessGrants.userId, userId), eq(accessGrants.deviceId, deviceId)),
    columns: { id: true },
  });

  if (existing) {
    return false;
  }

  await db.insert(accessGrants).values({
    userId,
    deviceId,
    role,
    grantedBy,
  });

  return true;
}

async function upsertDeviceSerials(
  serials: string[],
  boardType: SupportedBoard,
  grantUserId: number,
  grantRole: Role,
  grantedBy: number
): Promise<SyncSummary> {
  let created = 0;
  let existing = 0;
  let invalid = 0;
  let grantCreated = 0;
  const acceptedSerials: string[] = [];

  for (const serialRaw of serials) {
    const serial = normalizeSerial(serialRaw);

    if (!serial) {
      invalid += 1;
      continue;
    }

    const current = await db.query.devices.findFirst({
      where: eq(devices.serialNumber, serial),
      columns: { id: true },
    });

    let deviceId: number;

    if (current) {
      existing += 1;
      deviceId = current.id;
    } else {
      const inserted = await db
        .insert(devices)
        .values({
          serialNumber: serial,
          boardType,
          secretKey: secretFromSerial(serial),
        })
        .returning({ id: devices.id });

      const createdDevice = inserted[0];

      if (!createdDevice) {
        invalid += 1;
        continue;
      }

      created += 1;
      deviceId = createdDevice.id;
    }

    const createdGrant = await ensureAccessGrant(grantUserId, deviceId, grantRole, grantedBy);
    if (createdGrant) {
      grantCreated += 1;
    }

    acceptedSerials.push(serial);
  }

  return {
    created,
    existing,
    invalid,
    grantCreated,
    serials: acceptedSerials,
  };
}

export async function importInnovexDevices(options: InnovexImportOptions): Promise<SyncSummary> {
  const includeApi = options.includeApi ?? true;
  const csvPaths = options.csvPaths ?? (await discoverInnovexCsvPaths());
  const grantRole = options.grantRole ?? "ADMIN";
  const grantedBy = options.grantedBy ?? options.grantUserId;

  const serials = new Set<string>();

  for (const csvPath of csvPaths) {
    try {
      const discovered = await extractInnovexSerialsFromCsv(csvPath);
      for (const serial of discovered) {
        serials.add(serial);
      }
    } catch {
      // Ignore unreadable CSV files and continue with remaining sources.
    }
  }

  if (includeApi) {
    try {
      const innovexClient = new InnovexAPIClient(env.INNOVEX_API_TOKEN, 500);
      const apiDevices = await innovexClient.fetchDevices();
      for (const device of apiDevices) {
        serials.add(normalizeSerial(device.serial));
      }
    } catch {
      // API sync failure should not block CSV-based import.
    }
  }

  return upsertDeviceSerials(
    Array.from(serials),
    "PAYGO",
    options.grantUserId,
    grantRole,
    grantedBy
  );
}

export async function syncCloudSolarDevices(options: CloudSolarSyncOptions): Promise<SyncSummary> {
  const serials = new Set<string>();

  if (options.deviceIds) {
    for (const id of options.deviceIds) {
      serials.add(id);
    }
  }

  return upsertDeviceSerials(
    Array.from(serials),
    "CLOUD_SOLAR",
    options.grantUserId,
    options.grantRole ?? "ADMIN",
    options.grantedBy ?? options.grantUserId
  );
}
