import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { db } from "@/db/client";
import { users } from "@/db/schema";
import { createAssignmentTask } from "@/lib/services/taskService";

const BoardTypeSchema = z.enum(["CLOUD_SOLAR", "PAYGO", "INNOVEX"]);
const CustomerGenderSchema = z.enum([
  "MALE",
  "FEMALE",
  "OTHER",
  "PREFER_NOT_TO_SAY",
]);

const NestedCustomerSchema = z
  .object({
    name: z.string().trim().min(1).max(255).optional(),
    phone: z.string().trim().max(50).optional(),
    email: z.string().trim().email().optional(),
    location: z.string().trim().max(255).optional(),
    gender: CustomerGenderSchema.optional(),
  })
  .strict();

const NestedPedestalSchema = z
  .object({
    deviceIdText: z.string().trim().max(255).optional(),
    deviceIdImagePath: z.string().trim().max(1024).optional(),
  })
  .strict();

const NestedGpsSchema = z
  .object({
    latitude: z.number().min(-90).max(90).optional(),
    longitude: z.number().min(-180).max(180).optional(),
  })
  .strict();

const NestedAssignmentSchema = z
  .object({
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    notes: z.string().trim().max(500).optional(),
    selectedDeviceId: z.number().int().positive().optional(),
    requestedBoardType: BoardTypeSchema.optional(),
    preferredIdentifier: z.string().trim().max(100).optional(),
  })
  .strict();

const CreateTaskApiSchema = z
  .object({
    createdByUserId: z.number().int().positive().optional(),

    requestedBoardType: BoardTypeSchema.optional(),
    preferredIdentifier: z.string().trim().max(100).optional(),
    selectedDeviceId: z.number().int().positive().optional(),

    customerName: z.string().trim().min(1).max(255).optional(),
    customerPhone: z.string().trim().max(50).optional(),
    customerEmail: z.string().trim().email().optional(),
    customerLocation: z.string().trim().max(255).optional(),
    customerGender: CustomerGenderSchema.optional(),

    pedestalDeviceIdText: z.string().trim().max(255).optional(),
    pedestalDeviceIdImagePath: z.string().trim().max(1024).optional(),
    gpsLatitude: z.number().min(-90).max(90).optional(),
    gpsLongitude: z.number().min(-180).max(180).optional(),

    assignmentDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    notes: z.string().trim().max(500).optional(),

    customer: NestedCustomerSchema.optional(),
    pedestal: NestedPedestalSchema.optional(),
    gps: NestedGpsSchema.optional(),
    assignment: NestedAssignmentSchema.optional(),

    payload: z.record(z.string(), z.unknown()).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    additionalFields: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

type CreateTaskApiInput = z.infer<typeof CreateTaskApiSchema>;

const RESERVED_KEYS = new Set<string>([
  "createdByUserId",
  "requestedBoardType",
  "preferredIdentifier",
  "selectedDeviceId",
  "customerName",
  "customerPhone",
  "customerEmail",
  "customerLocation",
  "customerGender",
  "pedestalDeviceIdText",
  "pedestalDeviceIdImagePath",
  "gpsLatitude",
  "gpsLongitude",
  "assignmentDate",
  "notes",
  "customer",
  "pedestal",
  "gps",
  "assignment",
  "payload",
  "metadata",
  "additionalFields",
]);

type JsonObject = Record<string, unknown>;

function pickFirstString(...values: Array<string | undefined>): string | undefined {
  for (const value of values) {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (trimmed.length > 0) {
        return trimmed;
      }
    }
  }

  return undefined;
}

function pickFirstNumber(...values: Array<number | undefined>): number | undefined {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) {
      return value;
    }
  }

  return undefined;
}

function normalizeRole(role: string | null): "ADMIN" | "MANAGER" | "VIEWER" {
  if (role === "ADMIN" || role === "MANAGER") {
    return role;
  }

  return "VIEWER";
}

function buildMergedPayload(rawBody: JsonObject, parsed: CreateTaskApiInput): JsonObject {
  const extraTopLevelEntries = Object.entries(rawBody).filter(([key]) => !RESERVED_KEYS.has(key));

  const mergedPayload: JsonObject = {
    ...(parsed.payload ?? {}),
    ...(parsed.metadata ?? {}),
    ...(parsed.additionalFields ?? {}),
  };

  for (const [key, value] of extraTopLevelEntries) {
    if (!(key in mergedPayload)) {
      mergedPayload[key] = value;
    }
  }

  const assignmentDate =
    pickFirstString(parsed.assignmentDate, parsed.assignment?.date) ??
    new Date().toISOString().slice(0, 10);
  mergedPayload.assignmentDate = assignmentDate;

  const selectedDeviceId = pickFirstNumber(parsed.selectedDeviceId, parsed.assignment?.selectedDeviceId);
  if (selectedDeviceId) {
    mergedPayload.selectedDeviceId = selectedDeviceId;
  }

  const pedestalDeviceIdText = pickFirstString(
    parsed.pedestalDeviceIdText,
    parsed.pedestal?.deviceIdText
  );
  if (pedestalDeviceIdText) {
    mergedPayload.pedestalDeviceIdText = pedestalDeviceIdText;
  }

  const pedestalDeviceIdImagePath = pickFirstString(
    parsed.pedestalDeviceIdImagePath,
    parsed.pedestal?.deviceIdImagePath
  );
  if (pedestalDeviceIdImagePath) {
    mergedPayload.pedestalDeviceIdImagePath = pedestalDeviceIdImagePath;
  }

  const customerGender = parsed.customerGender ?? parsed.customer?.gender;
  if (customerGender) {
    mergedPayload.customerGender = customerGender;
  }

  const gpsLatitude = pickFirstNumber(parsed.gpsLatitude, parsed.gps?.latitude);
  if (gpsLatitude !== undefined) {
    mergedPayload.gpsLatitude = gpsLatitude;
  }

  const gpsLongitude = pickFirstNumber(parsed.gpsLongitude, parsed.gps?.longitude);
  if (gpsLongitude !== undefined) {
    mergedPayload.gpsLongitude = gpsLongitude;
  }

  if (gpsLatitude !== undefined && gpsLongitude !== undefined) {
    mergedPayload.gpsCoordinates = `${gpsLatitude},${gpsLongitude}`;
  }

  return mergedPayload;
}

async function resolveCreatedByUserId(
  requestHeaders: Awaited<ReturnType<typeof headers>>,
  parsed: CreateTaskApiInput
): Promise<{ userId: number; authMode: "session" | "api_key" } | null> {
  const sessionUserId = Number(requestHeaders.get("x-user-id"));

  if (Number.isInteger(sessionUserId) && sessionUserId > 0) {
    return { userId: sessionUserId, authMode: "session" };
  }

  const apiKeyAuthorized = requestHeaders.get("x-task-api-auth") === "1";
  if (!apiKeyAuthorized) {
    return null;
  }

  const createdByUserId = parsed.createdByUserId;
  if (!createdByUserId) {
    return null;
  }

  return { userId: createdByUserId, authMode: "api_key" };
}

async function ensureUserExists(userId: number): Promise<boolean> {
  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
    columns: { id: true },
  });

  return Boolean(user);
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204 });
}

export async function POST(request: Request) {
  let rawBody: unknown;

  try {
    rawBody = await request.json();
  } catch {
    return NextResponse.json(
      {
        error: "Invalid JSON body",
        message: "Request body must be valid JSON",
      },
      { status: 400 }
    );
  }

  const parsedResult = CreateTaskApiSchema.safeParse(rawBody);
  if (!parsedResult.success) {
    return NextResponse.json(
      {
        error: "Invalid request payload",
        details: parsedResult.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 400 }
    );
  }

  const parsed = parsedResult.data;
  const requestHeaders = await headers();
  const sessionRole = normalizeRole(requestHeaders.get("x-user-role"));

  const actor = await resolveCreatedByUserId(requestHeaders, parsed);
  if (!actor) {
    return NextResponse.json(
      {
        error: "Unauthorized",
        message:
          "Use an authenticated session cookie, or provide a valid task API key plus createdByUserId",
      },
      { status: 401 }
    );
  }

  const createdByUserExists = await ensureUserExists(actor.userId);
  if (!createdByUserExists) {
    return NextResponse.json(
      {
        error: "Invalid createdByUserId",
        message: "The specified creator user does not exist",
      },
      { status: 400 }
    );
  }

  const customerName = pickFirstString(parsed.customerName, parsed.customer?.name);
  if (!customerName) {
    return NextResponse.json(
      {
        error: "Invalid request payload",
        message: "customerName (or customer.name) is required",
      },
      { status: 400 }
    );
  }

  const requestedBoardType =
    parsed.requestedBoardType ?? parsed.assignment?.requestedBoardType ?? null;
  const selectedDeviceId = pickFirstNumber(parsed.selectedDeviceId, parsed.assignment?.selectedDeviceId);
  const preferredIdentifier = pickFirstString(
    parsed.preferredIdentifier,
    parsed.assignment?.preferredIdentifier,
    selectedDeviceId ? `ID:${selectedDeviceId}` : undefined
  );

  const customerPhone = pickFirstString(parsed.customerPhone, parsed.customer?.phone) ?? null;
  const customerEmail = pickFirstString(parsed.customerEmail, parsed.customer?.email) ?? null;
  const customerLocation =
    pickFirstString(parsed.customerLocation, parsed.customer?.location) ?? null;
  const notes = pickFirstString(parsed.notes, parsed.assignment?.notes) ?? null;

  const mergedPayload = buildMergedPayload(rawBody as JsonObject, parsed);

  try {
    const task = await createAssignmentTask({
      createdBy: actor.userId,
      requestedBoardType,
      preferredIdentifier,
      customerName,
      customerPhone,
      customerEmail,
      customerLocation,
      notes,
      payload: mergedPayload,
    });

    return NextResponse.json(
      {
        id: task.id,
        status: "OPEN",
        authMode: actor.authMode,
        actorRole: sessionRole,
        message: "Task assignment created",
      },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: "Task assignment creation failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}