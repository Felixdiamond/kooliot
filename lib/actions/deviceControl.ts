"use server";

import { headers } from "next/headers";
import { z } from "zod";

import { disableDevice, enableDevice } from "@/lib/services/deviceControlService";

const DeviceControlSchema = z.object({
  deviceId: z.number().int().positive(),
});

type DeviceControlActionResult = {
  success: boolean;
  message: string;
};

async function resolveRequestUser(): Promise<{ userId: number; role: string | null }> {
  const requestHeaders = await headers();
  const userId = Number(requestHeaders.get("x-user-id"));
  const role = requestHeaders.get("x-user-role");

  return { userId, role };
}

async function validateRequest(deviceId: number): Promise<{
  valid: boolean;
  error?: string;
  userId?: number;
}> {
  const parsed = DeviceControlSchema.safeParse({ deviceId });

  if (!parsed.success) {
    return {
      valid: false,
      error: parsed.error.issues[0]?.message ?? "Invalid device id",
    };
  }

  const { userId, role } = await resolveRequestUser();

  if (!Number.isInteger(userId) || userId <= 0) {
    return { valid: false, error: "Unauthorized" };
  }

  if (role === "VIEWER") {
    return { valid: false, error: "Insufficient permissions" };
  }

  return { valid: true, userId };
}

export async function enableDeviceAction(deviceId: number): Promise<DeviceControlActionResult> {
  const validation = await validateRequest(deviceId);

  if (!validation.valid || !validation.userId) {
    return {
      success: false,
      message: validation.error ?? "Invalid request",
    };
  }

  const result = await enableDevice(deviceId, validation.userId);
  return { success: result.success, message: result.message };
}

export async function disableDeviceAction(deviceId: number): Promise<DeviceControlActionResult> {
  const validation = await validateRequest(deviceId);

  if (!validation.valid || !validation.userId) {
    return {
      success: false,
      message: validation.error ?? "Invalid request",
    };
  }

  const result = await disableDevice(deviceId, validation.userId);
  return { success: result.success, message: result.message };
}