"use server";

import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { z } from "zod";

import { db } from "@/db/client";
import { devices, tokenLedger, activationLogs, users } from "@/db/schema";
import { generateToken, parseToken } from "@/lib/openpaygo/tokenGenerator";
import { checkAccess } from "@/lib/services/accessControl";
import type { TokenType } from "@/lib/types";

const PAYG_DISABLE_VALUE = 998;

const GenerateTokenSchema = z.object({
  deviceId: z.number().int().positive(),
  tokenType: z.enum(["SET_TIME", "ADD_TIME", "DISABLE", "ACTIVATE"]),
  value: z.number().int().min(1).max(995),
});

type GenerateTokenResult = {
  success: boolean;
  token?: string;
  error?: string;
};

function getTokenRequestFromFormData(formData: FormData) {
  const deviceIdRaw = formData.get("deviceId");
  const tokenTypeRaw = formData.get("tokenType");
  const valueRaw = formData.get("value");

  return {
    deviceId: Number(deviceIdRaw),
    tokenType: tokenTypeRaw,
    value: Number(valueRaw),
  };
}

export async function generateTokenAction(
  formData: FormData
): Promise<GenerateTokenResult> {
  const parsedInput = GenerateTokenSchema.safeParse(getTokenRequestFromFormData(formData));

  if (!parsedInput.success) {
    return {
      success: false,
      error: parsedInput.error.issues[0]?.message ?? "Invalid token request",
    };
  }

  const requestHeaders = await headers();
  const userId = Number(requestHeaders.get("x-user-id"));
  const userRole = requestHeaders.get("x-user-role");

  if (!Number.isInteger(userId) || userId <= 0) {
    return { success: false, error: "Unauthorized" };
  }

  if (userRole === "VIEWER") {
    return { success: false, error: "Insufficient permissions" };
  }

  const { deviceId, tokenType, value } = parsedInput.data;
  const normalizedTokenType: TokenType =
    tokenType === "ACTIVATE" ? "SET_TIME" : (tokenType as TokenType);
  const expectedTokenValue = normalizedTokenType === "DISABLE" ? PAYG_DISABLE_VALUE : value;

  const hasManagerAccess = await checkAccess(userId, "MANAGER");

  if (!hasManagerAccess && userRole !== "ADMIN") {
    return { success: false, error: "Access denied for this device" };
  }

  const [device, user] = await Promise.all([
    db.query.devices.findFirst({
      where: eq(devices.id, deviceId),
      columns: {
        id: true,
        secretKey: true,
        startingCode: true,
        tokenCount: true,
        angazaId: true,
      },
    }),
    db.query.users.findFirst({
      where: eq(users.id, userId),
      columns: { name: true },
    }),
  ]);

  if (!device) {
    return { success: false, error: "Device not found" };
  }
  
  const generatedByName = user?.name || "System";

  const count = device.tokenCount;

  let token: string;

  try {
    token = generateToken(
      device.secretKey,
      normalizedTokenType,
      value,
      count,
      device.startingCode
    );
  } catch {
    return { success: false, error: "Failed to generate token" };
  }

  const parsedToken = parseToken(token, device.secretKey, device.startingCode);

  if (
    !parsedToken ||
    parsedToken.tokenType !== normalizedTokenType ||
    parsedToken.value !== expectedTokenValue ||
    parsedToken.count <= count
  ) {
    return { success: false, error: "Token cryptographic verification failed" };
  }

  try {
    await db.transaction(async (tx) => {
      await tx.insert(tokenLedger).values({
        deviceId,
        tokenType: normalizedTokenType,
        value: expectedTokenValue,
        token,
        generatedBy: userId,
      });

      await tx.insert(activationLogs).values({
        deviceId,
        angazaId: device.angazaId || null,
        days: value,
        tokenGenerated: token,
        generatedBy: generatedByName,
        activatedAt: new Date(),
      });

      const updated = await tx
        .update(devices)
        .set({
          tokenCount: parsedToken.count,
          lastActivatedAt: new Date(),
          lastActivatedBy: generatedByName,
          updatedAt: new Date(),
        })
        .where(and(eq(devices.id, deviceId), eq(devices.tokenCount, count)))
        .returning({ id: devices.id });

      if (!updated[0]) {
        throw new Error("Device token counter changed during generation");
      }
    });
  } catch {
    return { success: false, error: "Failed to persist generated token. Please retry." };
  }

  return { success: true, token };
}
