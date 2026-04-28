"use server";

import { randomUUID } from "node:crypto";

import { put } from "@vercel/blob";
import { headers } from "next/headers";
import { z } from "zod";

import {
  completeAssignmentTask,
  createAssignmentTask,
  deleteAssignmentTask,
} from "@/lib/services/taskService";

const ALLOWED_IMAGE_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
// Vercel Functions have a 4.5 MB total request-body limit. Keep the image
// ceiling below that to leave room for the other form fields.
const MAX_IMAGE_SIZE_BYTES = 4 * 1024 * 1024;

const CreateTaskSchema = z.object({
  requestedBoardType: z.enum(["CLOUD_SOLAR", "PAYGO", "INNOVEX"]).optional().or(z.literal("")),
  preferredIdentifier: z.string().trim().max(100).optional().or(z.literal("")),
  selectedDeviceId: z.number().int().positive().optional(),
  customerName: z.string().trim().min(1).max(255),
  customerPhone: z.string().trim().max(50).optional().or(z.literal("")),
  customerEmail: z.string().trim().email().optional().or(z.literal("")),
  customerLocation: z.string().trim().max(255).optional().or(z.literal("")),
  pedestalDeviceIdText: z.string().trim().max(255).optional().or(z.literal("")),
  customerGender: z
    .enum(["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"])
    .optional()
    .or(z.literal("")),
  gpsLatitude: z.number().min(-90).max(90).optional(),
  gpsLongitude: z.number().min(-180).max(180).optional(),
  assignmentDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .or(z.literal("")),
  notes: z.string().trim().max(500).optional().or(z.literal("")),
  payload: z.record(z.string(), z.unknown()).optional(),
});

const CompleteTaskSchema = z.object({
  taskId: z.number().int().positive(),
  deviceId: z.number().int().positive(),
});

const DeleteTaskSchema = z.object({
  taskId: z.number().int().positive(),
});

export type AssignmentTaskActionResult = {
  success: boolean;
  message: string;
  taskId?: number;
  deviceId?: number;
};

async function resolveActor() {
  const requestHeaders = await headers();
  const userId = Number(requestHeaders.get("x-user-id"));
  const role = requestHeaders.get("x-user-role") ?? "VIEWER";

  return { userId, role };
}

function parsePayload(raw: FormDataEntryValue | null): Record<string, unknown> | undefined {
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
    throw new Error("Additional payload must be valid JSON");
  }

  throw new Error("Additional payload must be a JSON object");
}

function normalizeActorRole(role: string): "ADMIN" | "MANAGER" | "VIEWER" {
  if (role === "ADMIN" || role === "MANAGER") {
    return role;
  }

  return "VIEWER";
}

function parseOptionalNumber(raw: FormDataEntryValue | null): number | undefined {
  const text = String(raw ?? "").trim();

  if (!text) {
    return undefined;
  }

  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : Number.NaN;
}

function parseOptionalPositiveInt(raw: FormDataEntryValue | null): number | undefined {
  const text = String(raw ?? "").trim();

  if (!text) {
    return undefined;
  }

  const parsed = Number(text);

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return Number.NaN;
  }

  return parsed;
}

function extensionForMimeType(mimeType: string): string {
  if (mimeType === "image/jpeg") {
    return "jpg";
  }

  if (mimeType === "image/png") {
    return "png";
  }

  if (mimeType === "image/webp") {
    return "webp";
  }

  return "bin";
}

function getUploadedFile(raw: FormDataEntryValue | null): File | null {
  if (raw instanceof File && raw.size > 0) {
    return raw;
  }

  return null;
}

async function persistPedestalDevicePhoto(formData: FormData): Promise<string | undefined> {
  const cameraFile = getUploadedFile(formData.get("pedestalDeviceIdCamera"));
  const uploadedFile = getUploadedFile(formData.get("pedestalDeviceIdUpload"));
  const file = cameraFile ?? uploadedFile;

  if (!file) {
    return undefined;
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    throw new Error("Pedestal device image must be 5MB or smaller");
  }

  if (!ALLOWED_IMAGE_MIME_TYPES.has(file.type)) {
    throw new Error("Pedestal device image must be JPG, PNG, or WEBP");
  }

  const extension = extensionForMimeType(file.type);
  const fileName = `pedestal-device-ids/${Date.now()}-${randomUUID()}.${extension}`;

  const blob = await put(fileName, file, {
    access: "private",
    addRandomSuffix: false,
    contentType: file.type,
  });

  return blob.url;
}

export async function createAssignmentTaskAction(
  formData: FormData
): Promise<AssignmentTaskActionResult> {
  const { userId } = await resolveActor();

  if (!Number.isInteger(userId) || userId <= 0) {
    return { success: false, message: "Unauthorized" };
  }

  let payload: Record<string, unknown> | undefined;
  let pedestalDevicePhotoPath: string | undefined;

  try {
    payload = parsePayload(formData.get("payload"));
    pedestalDevicePhotoPath = await persistPedestalDevicePhoto(formData);
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Invalid payload",
    };
  }

  const parsed = CreateTaskSchema.safeParse({
    requestedBoardType: String(formData.get("requestedBoardType") ?? ""),
    preferredIdentifier: String(formData.get("preferredIdentifier") ?? ""),
    selectedDeviceId: parseOptionalPositiveInt(formData.get("selectedDeviceId")),
    customerName: String(formData.get("customerName") ?? ""),
    customerPhone: String(formData.get("customerPhone") ?? ""),
    customerEmail: String(formData.get("customerEmail") ?? ""),
    customerLocation: String(formData.get("customerLocation") ?? ""),
    pedestalDeviceIdText: String(formData.get("pedestalDeviceIdText") ?? ""),
    customerGender: String(formData.get("customerGender") ?? ""),
    gpsLatitude: parseOptionalNumber(formData.get("gpsLatitude")),
    gpsLongitude: parseOptionalNumber(formData.get("gpsLongitude")),
    assignmentDate: String(formData.get("assignmentDate") ?? ""),
    notes: String(formData.get("notes") ?? ""),
    payload,
  });

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid task payload",
    };
  }

  try {
    const assignmentDate = parsed.data.assignmentDate || new Date().toISOString().slice(0, 10);
    const enrichedPayload: Record<string, unknown> = {
      ...(parsed.data.payload ?? {}),
      assignmentDate,
    };

    if (parsed.data.selectedDeviceId) {
      enrichedPayload.selectedDeviceId = parsed.data.selectedDeviceId;
    }

    if (parsed.data.pedestalDeviceIdText) {
      enrichedPayload.pedestalDeviceIdText = parsed.data.pedestalDeviceIdText;
    }

    if (pedestalDevicePhotoPath) {
      enrichedPayload.pedestalDeviceIdImagePath = pedestalDevicePhotoPath;
    }

    if (parsed.data.customerGender) {
      enrichedPayload.customerGender = parsed.data.customerGender;
    }

    if (parsed.data.gpsLatitude !== undefined) {
      enrichedPayload.gpsLatitude = parsed.data.gpsLatitude;
    }

    if (parsed.data.gpsLongitude !== undefined) {
      enrichedPayload.gpsLongitude = parsed.data.gpsLongitude;
    }

    if (
      parsed.data.gpsLatitude !== undefined &&
      parsed.data.gpsLongitude !== undefined
    ) {
      enrichedPayload.gpsCoordinates = `${parsed.data.gpsLatitude},${parsed.data.gpsLongitude}`;
    }

    const task = await createAssignmentTask({
      createdBy: userId,
      requestedBoardType: parsed.data.requestedBoardType || null,
      preferredIdentifier:
        parsed.data.preferredIdentifier ||
        (parsed.data.selectedDeviceId ? `ID:${parsed.data.selectedDeviceId}` : null),
      customerName: parsed.data.customerName,
      customerPhone: parsed.data.customerPhone || null,
      customerEmail: parsed.data.customerEmail || null,
      customerLocation: parsed.data.customerLocation || null,
      notes: parsed.data.notes || null,
      payload: enrichedPayload,
    });

    return {
      success: true,
      message: "Registration or assignment task submitted",
      taskId: task.id,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to create task",
    };
  }
}

export async function deleteAssignmentTaskAction(
  formData: FormData
): Promise<AssignmentTaskActionResult> {
  const { userId, role } = await resolveActor();

  if (!Number.isInteger(userId) || userId <= 0) {
    return { success: false, message: "Unauthorized" };
  }

  const parsed = DeleteTaskSchema.safeParse({
    taskId: Number(formData.get("taskId")),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid delete payload",
    };
  }

  try {
    const deleted = await deleteAssignmentTask({
      taskId: parsed.data.taskId,
      actorId: userId,
      actorRole: normalizeActorRole(role),
    });

    return {
      success: true,
      message: "Task deleted",
      taskId: deleted.taskId,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to delete task",
    };
  }
}

export async function completeAssignmentTaskAction(
  formData: FormData
): Promise<AssignmentTaskActionResult> {
  const { userId, role } = await resolveActor();
  const actorRole = normalizeActorRole(role);

  if (!Number.isInteger(userId) || userId <= 0) {
    return { success: false, message: "Unauthorized" };
  }

  const parsed = CompleteTaskSchema.safeParse({
    taskId: Number(formData.get("taskId")),
    deviceId: Number(formData.get("deviceId")),
  });

  if (!parsed.success) {
    return {
      success: false,
      message: parsed.error.issues[0]?.message ?? "Invalid assignment completion payload",
    };
  }

  try {
    const completed = await completeAssignmentTask({
      taskId: parsed.data.taskId,
      deviceId: parsed.data.deviceId,
      actorId: userId,
      actorRole,
    });

    return {
      success: true,
      message: "Task completed and board registered",
      taskId: completed.taskId,
      deviceId: completed.deviceId,
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : "Failed to complete task",
    };
  }
}
