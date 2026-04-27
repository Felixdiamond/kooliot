import { and, eq, ilike, or, sql } from "drizzle-orm";

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

// For non-admin users: only returns devices they have been granted access to.
export async function listUserDevices(userId: number) {
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
    .from(accessGrants)
    .innerJoin(devices, eq(accessGrants.deviceId, devices.id))
    .where(eq(accessGrants.userId, userId));
}
function hasRequiredRole(actual: Role, required?: Role): boolean {
  if (!required) {
    return true;
  }

  return ROLE_RANK[actual] >= ROLE_RANK[required];
}

export async function checkAccess(
  userId: number,
  deviceId: number,
  requiredRole?: Role
): Promise<boolean> {
  const grant = await db.query.accessGrants.findFirst({
    where: and(eq(accessGrants.userId, userId), eq(accessGrants.deviceId, deviceId)),
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
  deviceId: number,
  role: Role,
  grantedBy: number
) {
  const existingGrant = await db.query.accessGrants.findFirst({
    where: and(eq(accessGrants.userId, userId), eq(accessGrants.deviceId, deviceId)),
  });

  if (existingGrant) {
    throw new Error("Access grant already exists for this user and device");
  }

  const created = await db.transaction(async (tx) => {
    const inserted = await tx
      .insert(accessGrants)
      .values({ userId, deviceId, role, grantedBy })
      .returning();

    await tx.insert(auditLogs).values({
      userId: grantedBy,
      action: "ACCESS_GRANT_CREATED",
      resourceType: "access_grant",
      resourceId: inserted[0]?.id,
      details: {
        userId,
        deviceId,
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
  deviceId: number,
  revokedBy: number
): Promise<void> {
  await db.transaction(async (tx) => {
    const existing = await tx.query.accessGrants.findFirst({
      where: and(eq(accessGrants.userId, userId), eq(accessGrants.deviceId, deviceId)),
    });

    if (!existing) {
      return;
    }

    await tx
      .delete(accessGrants)
      .where(and(eq(accessGrants.userId, userId), eq(accessGrants.deviceId, deviceId)));

    await tx.insert(auditLogs).values({
      userId: revokedBy,
      action: "ACCESS_GRANT_REVOKED",
      resourceType: "access_grant",
      resourceId: existing.id,
      details: {
        userId,
        deviceId,
        role: existing.role,
      },
    });
  });
}


export async function listDeviceUsers(deviceId: number) {
  return db
    .select({
      id: accessGrants.id,
      userId: accessGrants.userId,
      deviceId: accessGrants.deviceId,
      role: accessGrants.role,
      grantedBy: accessGrants.grantedBy,
      createdAt: accessGrants.createdAt,
      userName: users.name,
      userEmail: users.email,
    })
    .from(accessGrants)
    .innerJoin(users, eq(accessGrants.userId, users.id))
    .where(eq(accessGrants.deviceId, deviceId));
}
