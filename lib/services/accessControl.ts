import { eq, ilike, or, sql } from "drizzle-orm";

import { db } from "@/db/client";
import { accessGrants, auditLogs, devices, users } from "@/db/schema";
import type { Role } from "@/lib/types";

const ROLE_RANK: Record<Role, number> = {
  VIEWER: 1,
  MANAGER: 2,
  ADMIN: 3,
};

// For admins: returns ALL devices from the devices table with optional search + pagination.
export async function listAllDevices(opts: {
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const { search = "", limit = 50, offset = 0 } = opts;

  const baseQuery = db
    .select({
      id: devices.id,
      serialNumber: devices.serialNumber,
      boardType: devices.boardType,
      secretKey: devices.secretKey,
      status: devices.status,
      assignmentStatus: devices.assignmentStatus,
      customerName: devices.customerName,
      tokenCount: devices.tokenCount,
      lastActivatedAt: devices.lastActivatedAt,
      angazaId: devices.angazaId,
      paygoId: devices.paygoId,
      productType: devices.productType,
      createdAt: devices.createdAt,
      updatedAt: devices.updatedAt,
    })
    .from(devices);

  if (search) {
    return baseQuery
      .where(
        or(
          ilike(devices.serialNumber, `%${search}%`),
          ilike(devices.angazaId, `%${search}%`),
          ilike(devices.paygoId, `%${search}%`),
          ilike(devices.productType, `%${search}%`)
        )
      )
      .limit(limit)
      .offset(offset);
  }

  return baseQuery.limit(limit).offset(offset);
}

export async function countAllDevices(search = "") {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(devices)
    .where(
      search
        ? or(
            ilike(devices.serialNumber, `%${search}%`),
            ilike(devices.angazaId, `%${search}%`),
            ilike(devices.paygoId, `%${search}%`),
            ilike(devices.productType, `%${search}%`)
          )
        : undefined
    );
  return Number(result[0]?.count ?? 0);
}

// For non-admin users: grants are global (not per-device), so return all devices.
export async function listUserDevices(_userId: number) {
  return db
    .select({
      id: devices.id,
      serialNumber: devices.serialNumber,
      boardType: devices.boardType,
      secretKey: devices.secretKey,
      status: devices.status,
      assignmentStatus: devices.assignmentStatus,
      customerName: devices.customerName,
      tokenCount: devices.tokenCount,
      lastActivatedAt: devices.lastActivatedAt,
      angazaId: devices.angazaId,
      paygoId: devices.paygoId,
      productType: devices.productType,
      createdAt: devices.createdAt,
      updatedAt: devices.updatedAt,
    })
    .from(devices);
}
function hasRequiredRole(actual: Role, required?: Role): boolean {
  if (!required) {
    return true;
  }

  return ROLE_RANK[actual] >= ROLE_RANK[required];
}

export async function checkAccess(
  userId: number,
  requiredRole?: Role
): Promise<boolean> {
  const grant = await db.query.accessGrants.findFirst({
    where: eq(accessGrants.userId, userId),
    columns: {
      role: true,
    },
  });

  if (!grant) {
    return false;
  }

  return hasRequiredRole(grant.role as Role, requiredRole);
}

export async function createAccessGrant(
  userId: number,
  role: Role,
  grantedBy: number
) {
  const existingGrant = await db.query.accessGrants.findFirst({
    where: eq(accessGrants.userId, userId),
  });

  if (existingGrant) {
    throw new Error("Access grant already exists for this user");
  }

  const created = await db.transaction(async (tx) => {
    const inserted = await tx
      .insert(accessGrants)
      .values({ userId, role, grantedBy })
      .returning();

    await tx.insert(auditLogs).values({
      userId: grantedBy,
      action: "ACCESS_GRANT_CREATED",
      resourceType: "access_grant",
      resourceId: inserted[0]?.id,
      details: {
        userId,
        role,
      },
    });

    return inserted[0];
  });

  if (!created) {
    throw new Error("Failed to create access grant");
  }

  return created;
}

export async function revokeAccessGrant(
  userId: number,
  revokedBy: number
): Promise<void> {
  await db.transaction(async (tx) => {
    const existing = await tx.query.accessGrants.findFirst({
      where: eq(accessGrants.userId, userId),
    });

    if (!existing) {
      return;
    }

    await tx
      .delete(accessGrants)
      .where(eq(accessGrants.userId, userId));

    await tx.insert(auditLogs).values({
      userId: revokedBy,
      action: "ACCESS_GRANT_REVOKED",
      resourceType: "access_grant",
      resourceId: existing.id,
      details: {
        userId,
        role: existing.role,
      },
    });
  });
}



