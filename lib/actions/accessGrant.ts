"use server";

import { headers } from "next/headers";
import { z } from "zod";

import { isUniqueConstraintError } from "@/lib/security/db-errors";
import { createAccessGrant, revokeAccessGrant } from "@/lib/services/accessControl";

const CreateAccessGrantSchema = z.object({
  userId: z.number().int().positive(),
  deviceId: z.number().int().positive(),
  role: z.enum(["ADMIN", "MANAGER", "VIEWER"]),
});

const RevokeAccessGrantSchema = z.object({
  userId: z.number().int().positive(),
  deviceId: z.number().int().positive(),
});

type AccessGrantActionResult = {
  success: boolean;
  message: string;
};

async function resolveActor() {
  const requestHeaders = await headers();
  return {
    actorId: Number(requestHeaders.get("x-user-id")),
    actorRole: requestHeaders.get("x-user-role"),
  };
}

export async function createAccessGrantAction(formData: FormData): Promise<AccessGrantActionResult> {
  const parsed = CreateAccessGrantSchema.safeParse({
    userId: Number(formData.get("userId")),
    deviceId: Number(formData.get("deviceId")),
    role: formData.get("role"),
  });

  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Invalid access grant payload" };
  }

  const { actorId, actorRole } = await resolveActor();
  if (!Number.isInteger(actorId) || actorId <= 0) {
    return { success: false, message: "Unauthorized" };
  }

  if (actorRole !== "ADMIN") {
    return { success: false, message: "Only ADMIN can manage access grants" };
  }

  try {
    await createAccessGrant(parsed.data.userId, parsed.data.deviceId, parsed.data.role, actorId);
    return { success: true, message: "Access grant created" };
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      return { success: false, message: "Access grant already exists for this user and device" };
    }

    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to create access grant",
    };
  }
}

export async function revokeAccessGrantAction(formData: FormData): Promise<AccessGrantActionResult> {
  const parsed = RevokeAccessGrantSchema.safeParse({
    userId: Number(formData.get("userId")),
    deviceId: Number(formData.get("deviceId")),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid revoke payload",
    };
  }

  const { actorId, actorRole } = await resolveActor();
  if (!Number.isInteger(actorId) || actorId <= 0) {
    return { success: false, message: "Unauthorized" };
  }

  if (actorRole !== "ADMIN") {
    return { success: false, message: "Only ADMIN can manage access grants" };
  }

  try {
    await revokeAccessGrant(parsed.data.userId, parsed.data.deviceId, actorId);
    return { success: true, message: "Access grant revoked" };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to revoke access grant",
    };
  }
}