import { unstable_cache } from "next/cache";
import {
  and,
  desc,
  eq,
  gte,
  ilike,
  lte,
  or,
  placeholder,
  sql,
} from "drizzle-orm";
import { z } from "zod";

import { db } from "@/db/client";
import { accessGrants, devices } from "@/db/schema";
import { normalizeBoardTypeForStorage } from "@/lib/domain/boards";
import { isUniqueConstraintError } from "@/lib/security/db-errors";
import { sanitizeSearchQuery, sanitizeSerialNumber } from "@/lib/security/input";
import type { AssignmentStatus, BoardType, DeviceStatus } from "@/lib/types";

const RegisterDeviceSchema = z.object({
  serialNumber: z.string().regex(/^[A-Za-z0-9-]+$/),
  boardType: z.enum(["CLOUD_SOLAR", "PAYGO", "INNOVEX"]),
  secretKey: z.string().regex(/^[0-9a-fA-F]{32}([0-9a-fA-F]{32})?$/),
  startingCode: z
    .string()
    .regex(/^\d{1,9}$/)
    .optional()
    .or(z.literal("")),
  angazaId: z.string().trim().max(50).optional().or(z.literal("")),
  paygoId: z.string().trim().max(50).optional().or(z.literal("")),
  productType: z.string().trim().max(100).optional().or(z.literal("")),
});

const AssignCustomerSchema = z
  .object({
    deviceId: z.number().int().positive().optional(),
    identifier: z.string().trim().min(1).max(100).optional(),
    customerName: z.string().trim().min(1).max(255),
    customerPhone: z.string().trim().max(50).optional().or(z.literal("")),
    customerEmail: z.string().trim().email().optional().or(z.literal("")),
    customerLocation: z.string().trim().max(255).optional().or(z.literal("")),
    customerMetadata: z.record(z.string(), z.unknown()).optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.deviceId && !value.identifier) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["identifier"],
        message: "Provide either a deviceId or identifier",
      });
    }
  });

export type AssignCustomerInput = z.infer<typeof AssignCustomerSchema>;

export type FreeDeviceItem = {
  id: number;
  serialNumber: string;
  boardType: string | null;
  angazaId: string | null;
  paygoId: string | null;
  productType: string | null;
};

export type RegisterDeviceInput = z.infer<typeof RegisterDeviceSchema>;

export type DeviceFilters = {
  serial?: string;
  boardType?: BoardType;
  status?: DeviceStatus;
  assignmentStatus?: AssignmentStatus;
  createdFrom?: Date;
  createdTo?: Date;
};

export type Pagination = {
  page: number;
  pageSize: number;
};

type DeviceListItem = {
  id: number;
  serialNumber: string;
  angazaId: string | null;
  paygoId: string | null;
  productType: string | null;
  boardType: string | null;
  assignmentStatus: string;
  customerName: string | null;
  tokenCount: number;
  status: string | null;
  lastActivatedAt: Date | null;
  lastActivatedBy: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type PaginatedDevices = {
  items: DeviceListItem[];
  total: number;
  page: number;
  pageSize: number;
};

const getDeviceByIdPrepared = db
  .select({
    id: devices.id,
    serialNumber: devices.serialNumber,
    angazaId: devices.angazaId,
    paygoId: devices.paygoId,
    boardType: devices.boardType,
    secretKey: devices.secretKey,
    startingCode: devices.startingCode,
    productType: devices.productType,
    timeDivider: devices.timeDivider,
    messageId: devices.messageId,
    tokenCount: devices.tokenCount,
    lastCount: devices.lastCount,
    status: devices.status,
    assignmentStatus: devices.assignmentStatus,
    customerName: devices.customerName,
    customerPhone: devices.customerPhone,
    customerEmail: devices.customerEmail,
    customerLocation: devices.customerLocation,
    customerMetadata: devices.customerMetadata,
    sourceWorkbook: devices.sourceWorkbook,
    sourceSheet: devices.sourceSheet,
    extraFields: devices.extraFields,
    lastActivatedAt: devices.lastActivatedAt,
    lastActivatedBy: devices.lastActivatedBy,
    createdAt: devices.createdAt,
    updatedAt: devices.updatedAt,
  })
  .from(devices)
  .where(eq(devices.id, placeholder("deviceId")))
  .limit(1)
  .prepare("get_device_by_id_prepared");

const getDeviceMetadataCached = unstable_cache(
  async (deviceId: number) => {
    const rows = await getDeviceByIdPrepared.execute({ deviceId });
    return rows[0] ?? null;
  },
  ["device-metadata"],
  { revalidate: 300 }
);

export async function registerDevice(data: RegisterDeviceInput) {
  const parsed = RegisterDeviceSchema.parse({
    ...data,
    serialNumber: sanitizeSerialNumber(data.serialNumber),
  });

  const existing = await db.query.devices.findFirst({
    where: eq(devices.serialNumber, parsed.serialNumber),
    columns: { id: true },
  });

  if (existing) {
    throw new Error("Device serial number already exists");
  }

  let inserted;

  try {
    inserted = await db
      .insert(devices)
      .values({
        serialNumber: parsed.serialNumber,
        boardType: normalizeBoardTypeForStorage(parsed.boardType),
        secretKey: parsed.secretKey,
        startingCode: toNullable(parsed.startingCode),
        angazaId: toNullable(parsed.angazaId),
        paygoId: toNullable(parsed.paygoId),
        productType: toNullable(parsed.productType),
        assignmentStatus: "FREE",
      })
      .returning();
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw new Error("Device serial number already exists");
    }
    throw error;
  }

  const device = inserted[0];

  if (!device) {
    throw new Error("Failed to register device");
  }

  return device;
}

export async function getDeviceById(deviceId: number) {
  return getDeviceMetadataCached(deviceId);
}

function toNullable(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeIdentifier(identifier: string): string {
  return identifier.trim();
}

function boardTypeFilterExpr(boardType: BoardType) {
  const normalized = normalizeBoardTypeForStorage(boardType);

  if (normalized === "PAYGO") {
    return (
      or(eq(devices.boardType, "PAYGO"), eq(devices.boardType, "INNOVEX")) ??
      eq(devices.boardType, "PAYGO")
    );
  }

  return eq(devices.boardType, "CLOUD_SOLAR");
}

export async function findDeviceByIdentifier(identifier: string) {
  const normalized = normalizeIdentifier(identifier);

  if (!normalized) {
    return null;
  }

  const compact = normalized.replace(/\s+/g, "");
  const candidateValues = compact && compact !== normalized ? [normalized, compact] : [normalized];

  const predicates = candidateValues.flatMap((value) => [
    ilike(devices.serialNumber, value),
    ilike(devices.angazaId, value),
    ilike(devices.paygoId, value),
  ]);

  const [device] = await db
    .select({
      id: devices.id,
      serialNumber: devices.serialNumber,
      angazaId: devices.angazaId,
      paygoId: devices.paygoId,
      boardType: devices.boardType,
      assignmentStatus: devices.assignmentStatus,
    })
    .from(devices)
    .where(or(...predicates))
    .limit(1);

  return device ?? null;
}

export async function listFreeDevices(boardType?: BoardType): Promise<FreeDeviceItem[]> {
  const whereExpr = boardType
    ? and(eq(devices.assignmentStatus, "FREE"), boardTypeFilterExpr(boardType))
    : eq(devices.assignmentStatus, "FREE");

  return db
    .select({
      id: devices.id,
      serialNumber: devices.serialNumber,
      boardType: devices.boardType,
      angazaId: devices.angazaId,
      paygoId: devices.paygoId,
      productType: devices.productType,
    })
    .from(devices)
    .where(whereExpr)
    .orderBy(desc(devices.createdAt));
}

export async function assignDeviceToCustomer(input: AssignCustomerInput) {
  const parsed = AssignCustomerSchema.parse(input);

  let deviceId = parsed.deviceId;

  if (!deviceId) {
    const matched = await findDeviceByIdentifier(parsed.identifier ?? "");
    if (!matched) {
      throw new Error("Device not found for the provided identifier");
    }
    deviceId = matched.id;
  }

  const existing = await db.query.devices.findFirst({
    where: eq(devices.id, deviceId),
    columns: { id: true, customerMetadata: true },
  });

  if (!existing) {
    throw new Error("Device not found");
  }

  const metadata = {
    ...((existing.customerMetadata as Record<string, unknown> | null) ?? {}),
    ...(parsed.customerMetadata ?? {}),
  };

  const updated = await db
    .update(devices)
    .set({
      assignmentStatus: "ASSIGNED",
      customerName: parsed.customerName,
      customerPhone: toNullable(parsed.customerPhone),
      customerEmail: toNullable(parsed.customerEmail),
      customerLocation: toNullable(parsed.customerLocation),
      customerMetadata: metadata,
      updatedAt: new Date(),
    })
    .where(eq(devices.id, deviceId))
    .returning({ id: devices.id });

  if (!updated[0]) {
    throw new Error("Failed to assign device");
  }

  return updated[0];
}

export async function listDevices(
  userId: number,
  filters: DeviceFilters,
  pagination: Pagination
): Promise<PaginatedDevices> {
  const page = Math.max(1, pagination.page || 1);
  const pageSize = Math.max(1, Math.min(100, pagination.pageSize || 20));
  const offset = (page - 1) * pageSize;

  const whereClauses = [eq(accessGrants.userId, userId)];

  if (filters.serial) {
    whereClauses.push(ilike(devices.serialNumber, `%${filters.serial}%`));
  }

  if (filters.boardType) {
    whereClauses.push(boardTypeFilterExpr(filters.boardType));
  }

  if (filters.status) {
    whereClauses.push(eq(devices.status, filters.status));
  }

  if (filters.assignmentStatus) {
    whereClauses.push(eq(devices.assignmentStatus, filters.assignmentStatus));
  }

  if (filters.createdFrom) {
    whereClauses.push(gte(devices.createdAt, filters.createdFrom));
  }

  if (filters.createdTo) {
    whereClauses.push(lte(devices.createdAt, filters.createdTo));
  }

  const whereExpr = and(...whereClauses);

  const items = await db
    .select({
      id: devices.id,
      serialNumber: devices.serialNumber,
      angazaId: devices.angazaId,
      paygoId: devices.paygoId,
      productType: devices.productType,
      boardType: devices.boardType,
      assignmentStatus: devices.assignmentStatus,
      customerName: devices.customerName,
      tokenCount: devices.tokenCount,
      status: devices.status,
      lastActivatedAt: devices.lastActivatedAt,
      lastActivatedBy: devices.lastActivatedBy,
      createdAt: devices.createdAt,
      updatedAt: devices.updatedAt,
    })
    .from(accessGrants)
    .innerJoin(devices, eq(accessGrants.deviceId, devices.id))
    .where(whereExpr)
    .orderBy(desc(devices.createdAt))
    .limit(pageSize)
    .offset(offset);

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(accessGrants)
    .innerJoin(devices, eq(accessGrants.deviceId, devices.id))
    .where(whereExpr);

  return {
    items,
    total: Number(count ?? 0),
    page,
    pageSize,
  };
}

export async function updateDeviceStatus(
  deviceId: number,
  status: DeviceStatus
): Promise<void> {
  await db
    .update(devices)
    .set({
      status,
      updatedAt: new Date(),
    })
    .where(eq(devices.id, deviceId));
}

export async function searchDevices(userId: number, query: string) {
  const sanitizedQuery = sanitizeSearchQuery(query);

  if (!sanitizedQuery) {
    return [];
  }

  return db
    .select({
      id: devices.id,
      serialNumber: devices.serialNumber,
      angazaId: devices.angazaId,
      paygoId: devices.paygoId,
      productType: devices.productType,
      boardType: devices.boardType,
      assignmentStatus: devices.assignmentStatus,
      status: devices.status,
      lastActivatedAt: devices.lastActivatedAt,
      createdAt: devices.createdAt,
      updatedAt: devices.updatedAt,
    })
    .from(accessGrants)
    .innerJoin(devices, eq(accessGrants.deviceId, devices.id))
    .where(
      and(
        eq(accessGrants.userId, userId),
        or(
          ilike(devices.serialNumber, `%${sanitizedQuery}%`),
          ilike(devices.angazaId, `%${sanitizedQuery}%`),
          ilike(devices.paygoId, `%${sanitizedQuery}%`)
        )
      )
    )
    .orderBy(desc(devices.createdAt))
    .limit(25);
}
