import { eq } from "drizzle-orm";

import { db } from "@/db/client";
import { devices } from "@/db/schema";
import { isRemoteCapableBoard } from "@/lib/domain/boards";
import { env } from "@/lib/env";
import { CloudSolarAPIClient } from "@/lib/clients/cloudSolarClient";
import { checkAccess } from "@/lib/services/accessControl";

export type CommandResult = {
  success: boolean;
  status: "success" | "failed";
  message: string;
};

async function sendDeviceCommand(
  deviceId: number,
  userId: number,
  enabled: boolean
): Promise<CommandResult> {
  const hasAccess = await checkAccess(userId, "MANAGER");

  if (!hasAccess) {
    return {
      success: false,
      status: "failed",
      message: "Access denied for this device",
    };
  }

  const device = await db.query.devices.findFirst({
    where: eq(devices.id, deviceId),
    columns: {
      id: true,
      boardType: true,
    },
  });

  if (!device) {
    return {
      success: false,
      status: "failed",
      message: "Device not found",
    };
  }

  if (!isRemoteCapableBoard(device.boardType)) {
    return {
      success: false,
      status: "failed",
      message: "Remote control is only supported for CLOUD_PAYGO boards",
    };
  }

  const commandType = enabled ? "enable" : "disable";
  const client = new CloudSolarAPIClient(env.CLOUD_SOLAR_API_KEY);

  try {
    await client.setDeviceState(String(deviceId), enabled);

    await db
      .update(devices)
      .set({
        status: enabled ? "active" : "inactive",
        updatedAt: new Date(),
      })
      .where(eq(devices.id, deviceId));

    return {
      success: true,
      status: "success",
      message: `Device ${commandType} command sent successfully`,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown upstream error";

    return {
      success: false,
      status: "failed",
      message,
    };
  }
}

export async function enableDevice(deviceId: number, userId: number): Promise<CommandResult> {
  return sendDeviceCommand(deviceId, userId, true);
}

export async function disableDevice(deviceId: number, userId: number): Promise<CommandResult> {
  return sendDeviceCommand(deviceId, userId, false);
}