import { createHash } from "node:crypto";
import { readdir } from "node:fs/promises";
import path from "node:path";

import { eq } from "drizzle-orm";
import * as xlsx from "xlsx";

import { db } from "@/db/client";
import { accessGrants, devices } from "@/db/schema";
import { normalizeBoardTypeForStorage } from "@/lib/domain/boards";
import { sanitizeSerialNumber } from "@/lib/security/input";
import type { Role } from "@/lib/types";

export type SpreadsheetSyncOptions = {
  workbookPaths?: string[];
  includeDefaultDirectory?: boolean;
  grantUserId: number;
  grantRole?: Role;
  grantedBy?: number;
};

export type SpreadsheetSyncSummary = {
  created: number;
  updated: number;
  skipped: number;
  invalidSecret: number;
  grantCreated: number;
  processedSheets: number;
  processedRows: number;
  workbookCount: number;
};

const KNOWN_HEADERS = new Set([
  "serial number",
  "serial",
  "kb serial",
  "kb id",
  "imei",
  "paygo id",
  "paygoid",
  "angaza id",
  "angaza unit number",
  "unit number",
  "secret key",
  "key",
  "starting code",
  "start code",
  "product type",
  "hardware model",
  "freezer sizes",
  "time divider",
  "message id",
  "last count",
  "last_count",
  "count",
  "customer name",
  "name",
  "phone",
  "phone number",
  "customer phone",
  "email",
  "customer email",
  "location",
  "customer location",
  "address",
  "notes",
]);

function normalizeHeader(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/[^a-z0-9 ]+/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function normalizeCell(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).trim();
}

function pickFirst(record: Record<string, string>, keys: string[]): string {
  for (const key of keys) {
    const normalizedKey = normalizeHeader(key);
    const value = record[normalizedKey] ?? "";
    if (value && value.toLowerCase() !== "undefined") {
      return value;
    }
  }

  return "";
}

function toIntOrNull(value: string): number | null {
  if (!value) {
    return null;
  }

  const cleaned = value.replace(/,/g, "");
  const parsed = Number(cleaned);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return Math.trunc(parsed);
}

function toNullable(value: string): string | null {
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeSecret(raw: string): string | null {
  const value = raw.trim().toLowerCase();
  if (!/^[0-9a-f]+$/.test(value)) {
    return null;
  }

  if (value.length === 32 || value.length === 64) {
    return value;
  }

  return null;
}

function ensure64HexSecret(raw: string): string | null {
  const secret = normalizeSecret(raw);
  if (!secret) {
    return null;
  }

  if (secret.length === 64) {
    return secret;
  }

  // Expand 16-byte sheet keys into 32-byte keys deterministically.
  return createHash("sha256").update(Buffer.from(secret, "hex")).digest("hex");
}

function boardTypeFromSheetName(sheetName: string): "CLOUD_SOLAR" | "PAYGO" {
  return /cloud\s*paygo/i.test(sheetName) ? "CLOUD_SOLAR" : "PAYGO";
}

async function ensureAccessGrant(
  userId: number,
  _deviceId: number,
  role: Role,
  grantedBy: number
): Promise<boolean> {
  const existing = await db.query.accessGrants.findFirst({
    where: eq(accessGrants.userId, userId),
    columns: { id: true },
  });

  if (existing) {
    return false;
  }

  await db.insert(accessGrants).values({ userId, role, grantedBy });
  return true;
}

async function discoverWorkbookPaths(): Promise<string[]> {
  const dataDir = path.resolve(process.cwd(), "..", "data2migrate");

  try {
    const files = await readdir(dataDir, { withFileTypes: true });
    return files
      .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".xlsx"))
      .map((entry) => path.join(dataDir, entry.name));
  } catch {
    return [];
  }
}

function buildRecord(headers: string[], row: unknown[]): Record<string, string> {
  const record: Record<string, string> = {};

  for (let i = 0; i < headers.length; i += 1) {
    const header = headers[i] || `column ${i}`;
    record[header] = normalizeCell(row[i]);
  }

  return record;
}

function extractExtraFields(record: Record<string, string>): Record<string, unknown> {
  const extra: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(record)) {
    if (!value || KNOWN_HEADERS.has(key)) {
      continue;
    }

    extra[key] = value;
  }

  return extra;
}

export async function syncInventoryFromSheets(
  options: SpreadsheetSyncOptions
): Promise<SpreadsheetSyncSummary> {
  const grantRole = options.grantRole ?? "ADMIN";
  const grantedBy = options.grantedBy ?? options.grantUserId;
  const workbookPaths = [
    ...(options.workbookPaths ?? []),
    ...(options.includeDefaultDirectory === false ? [] : await discoverWorkbookPaths()),
  ];

  const uniqueWorkbookPaths = Array.from(new Set(workbookPaths));

  let created = 0;
  let updated = 0;
  let skipped = 0;
  let invalidSecret = 0;
  let grantCreated = 0;
  let processedSheets = 0;
  let processedRows = 0;

  for (const workbookPath of uniqueWorkbookPaths) {
    let workbook: xlsx.WorkBook;

    try {
      workbook = xlsx.readFile(workbookPath);
    } catch {
      continue;
    }

    for (const sheetName of workbook.SheetNames) {
      if (/^(breakdown|user sheet|token information|sheet5)$/i.test(sheetName.trim())) {
        continue;
      }

      const sheet = workbook.Sheets[sheetName];
      if (!sheet) {
        continue;
      }

      const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: "" }) as unknown[][];
      if (rows.length === 0) {
        continue;
      }

      processedSheets += 1;

      const headerRow = rows[0] ?? [];
      const normalizedHeaders = headerRow.map((value, index) => {
        const normalized = normalizeHeader(value);
        return normalized || `column ${index}`;
      });

      const firstDataRowIndex = 1;
      const boardType = boardTypeFromSheetName(sheetName);

      for (let rowIndex = firstDataRowIndex; rowIndex < rows.length; rowIndex += 1) {
        const row = rows[rowIndex] ?? [];
        const record = buildRecord(normalizedHeaders, row);

        const rawSerial = pickFirst(record, [
          "serial number",
          "serial",
          "kb serial",
          "kb id",
          "paygo id",
          "imei",
          "column 0",
        ]);

        const serialNumber = sanitizeSerialNumber(rawSerial);
        if (!serialNumber || /^serial\b/i.test(serialNumber)) {
          skipped += 1;
          continue;
        }

        const rawSecret = pickFirst(record, ["secret key", "key"]);
        const secretKey = ensure64HexSecret(rawSecret);

        if (!secretKey) {
          invalidSecret += 1;
          skipped += 1;
          continue;
        }

        const unitNumber = pickFirst(record, ["unit number", "angaza unit number"]);
        const angazaCandidate = pickFirst(record, ["angaza id", "angaza unit number", "unit number"]);
        const paygoCandidate = pickFirst(record, ["paygo id", "unit number", "angaza id"]);

        const angazaId = toNullable(angazaCandidate || unitNumber || paygoCandidate);
        const paygoId = toNullable(paygoCandidate || unitNumber || angazaCandidate);
        const startingCode = toNullable(pickFirst(record, ["starting code", "start code"]));
        const productType = toNullable(
          pickFirst(record, ["product type", "hardware model", "freezer sizes"])
        );

        const customerName = toNullable(pickFirst(record, ["customer name", "name"]));
        const customerPhone = toNullable(
          pickFirst(record, ["customer phone", "phone", "phone number"])
        );
        const customerEmail = toNullable(pickFirst(record, ["customer email", "email"]));
        const customerLocation = toNullable(
          pickFirst(record, ["customer location", "location", "address"])
        );

        const timeDivider = toIntOrNull(pickFirst(record, ["time divider"]));
        const messageId = toIntOrNull(pickFirst(record, ["message id"]));
        const lastCount = toIntOrNull(pickFirst(record, ["last count", "last_count", "count"]));

        const extraFields = extractExtraFields(record);

        const existing = await db.query.devices.findFirst({
          where: eq(devices.serialNumber, serialNumber),
          columns: {
            id: true,
            assignmentStatus: true,
            customerName: true,
            customerPhone: true,
            customerEmail: true,
            customerLocation: true,
            customerMetadata: true,
            extraFields: true,
          },
        });

        const mergedExtraFields = {
          ...((existing?.extraFields as Record<string, unknown> | null) ?? {}),
          ...extraFields,
        };

        let deviceId: number;

        if (existing) {
          const updatedRows = await db
            .update(devices)
            .set({
              boardType: normalizeBoardTypeForStorage(boardType),
              secretKey,
              startingCode,
              angazaId,
              paygoId,
              productType,
              timeDivider,
              messageId,
              lastCount,
              sourceWorkbook: path.basename(workbookPath),
              sourceSheet: sheetName,
              extraFields: mergedExtraFields,
              customerName: existing.customerName ?? customerName,
              customerPhone: existing.customerPhone ?? customerPhone,
              customerEmail: existing.customerEmail ?? customerEmail,
              customerLocation: existing.customerLocation ?? customerLocation,
              customerMetadata: existing.customerMetadata ?? {},
              assignmentStatus: existing.assignmentStatus,
              updatedAt: new Date(),
            })
            .where(eq(devices.id, existing.id))
            .returning({ id: devices.id });

          const updatedDevice = updatedRows[0];
          if (!updatedDevice) {
            skipped += 1;
            continue;
          }

          updated += 1;
          deviceId = updatedDevice.id;
        } else {
          const insertedRows = await db
            .insert(devices)
            .values({
              serialNumber,
              boardType: normalizeBoardTypeForStorage(boardType),
              secretKey,
              startingCode,
              angazaId,
              paygoId,
              productType,
              timeDivider,
              messageId,
              lastCount,
              assignmentStatus: "FREE",
              customerName,
              customerPhone,
              customerEmail,
              customerLocation,
              customerMetadata: {},
              sourceWorkbook: path.basename(workbookPath),
              sourceSheet: sheetName,
              extraFields,
            })
            .returning({ id: devices.id });

          const inserted = insertedRows[0];
          if (!inserted) {
            skipped += 1;
            continue;
          }

          created += 1;
          deviceId = inserted.id;
        }

        const grantWasCreated = await ensureAccessGrant(
          options.grantUserId,
          deviceId,
          grantRole,
          grantedBy
        );
        if (grantWasCreated) {
          grantCreated += 1;
        }

        processedRows += 1;
      }
    }
  }

  return {
    created,
    updated,
    skipped,
    invalidSecret,
    grantCreated,
    processedSheets,
    processedRows,
    workbookCount: uniqueWorkbookPaths.length,
  };
}
