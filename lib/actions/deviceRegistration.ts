"use server";

import { headers } from "next/headers";
import { z } from "zod";

import { createAccessGrant } from "@/lib/services/accessControl";
import { assignDeviceToCustomer, registerDevice } from "@/lib/services/deviceService";

const RegisterDeviceActionSchema = z.object({
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

const AssignDeviceActionSchema = z
  .object({
    deviceId: z.number().int().positive().optional(),
    identifier: z.string().trim().max(100).optional(),
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
        message: "Provide a device ID or lookup identifier",
      });
    }
  });

type RegisterDeviceActionResult = {
  success: boolean;
  message: string;
  deviceId?: number;
};

function parseCustomerMetadata(raw: FormDataEntryValue | null): Record<string, unknown> | undefined {
  if (!raw) {
    return undefined;
  }

  const text = String(raw).trim();
  if (!text) {
    return undefined;
  }

  try {
    const parsed = JSON.parse(text);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    throw new Error("Customer metadata must be a valid JSON object");
  }

  throw new Error("Customer metadata must be a JSON object");
}

async function resolveActor() {
  const requestHeaders = await headers();
  const userId = Number(requestHeaders.get("x-user-id"));
  const role = requestHeaders.get("x-user-role");

  if (!Number.isInteger(userId) || userId <= 0) {
    return { userId: -1, role };
  }

  return { userId, role };
}

export async function registerDeviceAction(
  formData: FormData
): Promise<RegisterDeviceActionResult> {
  const parsed = RegisterDeviceActionSchema.safeParse({
    serialNumber: String(formData.get("serialNumber") ?? ""),
    boardType: formData.get("boardType"),
    secretKey: String(formData.get("secretKey") ?? ""),
    startingCode: String(formData.get("startingCode") ?? ""),
    angazaId: String(formData.get("angazaId") ?? ""),
    paygoId: String(formData.get("paygoId") ?? ""),
    productType: String(formData.get("productType") ?? ""),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid device registration payload",
    };
  }

  const { userId, role } = await resolveActor();

  if (!Number.isInteger(userId) || userId <= 0) {
    return { success: false, message: "Unauthorized" };
  }

  if (role !== "ADMIN" && role !== "MANAGER") {
    return { success: false, message: "Only ADMIN or MANAGER can register devices" };
  }

  try {
    const device = await registerDevice(parsed.data);

    const creatorRole = role === "ADMIN" ? "ADMIN" : "MANAGER";
    await createAccessGrant(userId, device.id, creatorRole, userId);

    return {
      success: true,
      message: "Device registered successfully",
      deviceId: device.id,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to register device",
    };
  }
}

export async function assignDeviceAction(
  formData: FormData
): Promise<RegisterDeviceActionResult> {
  let customerMetadata: Record<string, unknown> | undefined;

  try {
    customerMetadata = parseCustomerMetadata(formData.get("customerMetadata"));
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Invalid customer metadata",
    };
  }

  const deviceIdRaw = Number(formData.get("deviceId"));
  const parsed = AssignDeviceActionSchema.safeParse({
    deviceId:
      Number.isInteger(deviceIdRaw) && deviceIdRaw > 0 ? deviceIdRaw : undefined,
    identifier: String(formData.get("identifier") ?? ""),
    customerName: String(formData.get("customerName") ?? ""),
    customerPhone: String(formData.get("customerPhone") ?? ""),
    customerEmail: String(formData.get("customerEmail") ?? ""),
    customerLocation: String(formData.get("customerLocation") ?? ""),
    customerMetadata,
  });

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid assignment payload",
    };
  }

  const { userId, role } = await resolveActor();

  if (!Number.isInteger(userId) || userId <= 0) {
    return { success: false, message: "Unauthorized" };
  }

  if (role !== "ADMIN" && role !== "MANAGER") {
    return { success: false, message: "Only ADMIN or MANAGER can assign devices" };
  }

  try {
    const assigned = await assignDeviceToCustomer(parsed.data);

    try {
      await createAccessGrant(
        userId,
        assigned.id,
        role === "ADMIN" ? "ADMIN" : "MANAGER",
        userId
      );
    } catch {
      // Ignore duplicate grants.
    }

    return {
      success: true,
      message: "Device registered to customer successfully",
      deviceId: assigned.id,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to assign device",
    };
  }
}