import { and, desc, eq, sql } from "drizzle-orm";

import { db } from "@/db/client";
import { accessGrants, assignmentTasks, devices, users } from "@/db/schema";
import { normalizeBoardTypeForStorage } from "@/lib/domain/boards";
import type { BoardType, Role } from "@/lib/types";

type DbTransaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type CreateAssignmentTaskInput = {
  createdBy: number;
  requestedBoardType?: BoardType | null;
  preferredIdentifier?: string | null;
  customerName: string;
  customerPhone?: string | null;
  customerEmail?: string | null;
  customerLocation?: string | null;
  notes?: string | null;
  payload?: Record<string, unknown>;
};

export type CompleteAssignmentTaskInput = {
  taskId: number;
  deviceId: number;
  actorId: number;
  actorRole: Role;
};

export type DeleteAssignmentTaskInput = {
  taskId: number;
  actorId: number;
  actorRole: Role;
};

function toNullable(value?: string | null): string | null {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

async function ensureAccessGrantTx(
  tx: DbTransaction,
  userId: number,
  deviceId: number,
  role: Role,
  grantedBy: number
): Promise<void> {
  const existing = await tx.query.accessGrants.findFirst({
    where: and(eq(accessGrants.userId, userId), eq(accessGrants.deviceId, deviceId)),
    columns: { id: true },
  });

  if (existing) {
    return;
  }

  await tx.insert(accessGrants).values({ userId, deviceId, role, grantedBy });
}

export async function createAssignmentTask(input: CreateAssignmentTaskInput) {
  const inserted = await db
    .insert(assignmentTasks)
    .values({
      createdBy: input.createdBy,
      status: "OPEN",
      requestedBoardType: input.requestedBoardType
        ? normalizeBoardTypeForStorage(input.requestedBoardType)
        : null,
      preferredIdentifier: toNullable(input.preferredIdentifier),
      customerName: input.customerName.trim(),
      customerPhone: toNullable(input.customerPhone),
      customerEmail: toNullable(input.customerEmail),
      customerLocation: toNullable(input.customerLocation),
      notes: toNullable(input.notes),
      payload: input.payload ?? {},
      updatedAt: new Date(),
    })
    .returning({ id: assignmentTasks.id });

  if (!inserted[0]) {
    throw new Error("Failed to create assignment task");
  }

  return inserted[0];
}

export async function listViewerTasks(userId: number) {
  return db
    .select({
      id: assignmentTasks.id,
      status: assignmentTasks.status,
      requestedBoardType: assignmentTasks.requestedBoardType,
      preferredIdentifier: assignmentTasks.preferredIdentifier,
      customerName: assignmentTasks.customerName,
      customerPhone: assignmentTasks.customerPhone,
      customerEmail: assignmentTasks.customerEmail,
      customerLocation: assignmentTasks.customerLocation,
      notes: assignmentTasks.notes,
      payload: assignmentTasks.payload,
      assignedDeviceId: assignmentTasks.assignedDeviceId,
      assignedDeviceSerial: devices.serialNumber,
      createdAt: assignmentTasks.createdAt,
      completedAt: assignmentTasks.completedAt,
    })
    .from(assignmentTasks)
    .leftJoin(devices, eq(assignmentTasks.assignedDeviceId, devices.id))
    .where(eq(assignmentTasks.createdBy, userId))
    .orderBy(desc(assignmentTasks.createdAt))
    .limit(50);
}

export async function listOpenAssignmentTasks() {
  return db
    .select({
      id: assignmentTasks.id,
      createdBy: assignmentTasks.createdBy,
      createdByName: users.name,
      requestedBoardType: assignmentTasks.requestedBoardType,
      preferredIdentifier: assignmentTasks.preferredIdentifier,
      customerName: assignmentTasks.customerName,
      customerPhone: assignmentTasks.customerPhone,
      customerEmail: assignmentTasks.customerEmail,
      customerLocation: assignmentTasks.customerLocation,
      notes: assignmentTasks.notes,
      payload: assignmentTasks.payload,
      createdAt: assignmentTasks.createdAt,
    })
    .from(assignmentTasks)
    .innerJoin(users, eq(assignmentTasks.createdBy, users.id))
    .where(eq(assignmentTasks.status, "OPEN"))
    .orderBy(desc(assignmentTasks.createdAt))
    .limit(100);
}

export async function countOpenAssignmentTasks(): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(assignmentTasks)
    .where(eq(assignmentTasks.status, "OPEN"));

  return Number(result[0]?.count ?? 0);
}

export async function countViewerOpenTasks(userId: number): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(assignmentTasks)
    .where(
      and(
        eq(assignmentTasks.createdBy, userId),
        eq(assignmentTasks.status, "OPEN")
      )
    );

  return Number(result[0]?.count ?? 0);
}

export async function deleteAssignmentTask(input: DeleteAssignmentTaskInput) {
  return db.transaction(async (tx) => {
    const task = await tx.query.assignmentTasks.findFirst({
      where: eq(assignmentTasks.id, input.taskId),
      columns: {
        id: true,
        status: true,
        createdBy: true,
      },
    });

    if (!task) {
      throw new Error("Task not found");
    }

    if (task.status !== "OPEN") {
      throw new Error("Only open tasks can be deleted");
    }

    const canDeleteAnyTask =
      input.actorRole === "ADMIN" || input.actorRole === "MANAGER";
    const canDeleteOwnTask = task.createdBy === input.actorId;

    if (!canDeleteAnyTask && !canDeleteOwnTask) {
      throw new Error("You can only delete your own open tasks");
    }

    await tx.delete(assignmentTasks).where(eq(assignmentTasks.id, input.taskId));

    return { taskId: task.id };
  });
}

export async function completeAssignmentTask(input: CompleteAssignmentTaskInput) {
  return db.transaction(async (tx) => {
    const task = await tx.query.assignmentTasks.findFirst({
      where: eq(assignmentTasks.id, input.taskId),
      columns: {
        id: true,
        status: true,
        requestedBoardType: true,
        customerName: true,
        customerPhone: true,
        customerEmail: true,
        customerLocation: true,
        notes: true,
        payload: true,
        createdBy: true,
      },
    });

    if (!task) {
      throw new Error("Task not found");
    }

    if (task.status !== "OPEN") {
      throw new Error("Task is already closed");
    }

    if (input.actorRole === "VIEWER" && task.createdBy !== input.actorId) {
      throw new Error("You can only register your own tasks");
    }

    const device = await tx.query.devices.findFirst({
      where: eq(devices.id, input.deviceId),
      columns: {
        id: true,
        boardType: true,
        assignmentStatus: true,
        customerMetadata: true,
      },
    });

    if (!device) {
      throw new Error("Selected device does not exist");
    }

    const normalizedRequestedBoard = task.requestedBoardType
      ? normalizeBoardTypeForStorage(task.requestedBoardType)
      : null;
    const normalizedDeviceBoard = device.boardType
      ? normalizeBoardTypeForStorage(device.boardType)
      : null;

    if (normalizedRequestedBoard && normalizedDeviceBoard !== normalizedRequestedBoard) {
      throw new Error("Selected device does not match requested board type");
    }

    if (device.assignmentStatus === "ASSIGNED") {
      throw new Error("Selected device is already assigned");
    }

    const mergedMetadata = {
      ...((device.customerMetadata as Record<string, unknown> | null) ?? {}),
      ...((task.payload as Record<string, unknown> | null) ?? {}),
    };

    await tx
      .update(devices)
      .set({
        assignmentStatus: "ASSIGNED",
        customerName: task.customerName,
        customerPhone: task.customerPhone,
        customerEmail: task.customerEmail,
        customerLocation: task.customerLocation,
        customerMetadata: mergedMetadata,
        updatedAt: new Date(),
      })
      .where(eq(devices.id, input.deviceId));

    await tx
      .update(assignmentTasks)
      .set({
        status: "COMPLETED",
        assignedDeviceId: input.deviceId,
        completedBy: input.actorId,
        completedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(assignmentTasks.id, input.taskId));

    await ensureAccessGrantTx(tx, task.createdBy, input.deviceId, "VIEWER", input.actorId);

    if (input.actorRole === "MANAGER" || input.actorRole === "ADMIN") {
      await ensureAccessGrantTx(tx, input.actorId, input.deviceId, "MANAGER", input.actorId);
    }

    return { taskId: input.taskId, deviceId: input.deviceId };
  });
}
