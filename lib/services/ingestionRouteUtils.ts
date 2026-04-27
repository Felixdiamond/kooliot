import { z } from "zod";

import { env } from "@/lib/env";
import type { IngestionResult, IngestionStatus } from "@/lib/types";

const DateRangeSchema = z
  .object({
    startTime: z.string().datetime().optional(),
    endTime: z.string().datetime().optional(),
  })
  .superRefine((value, ctx) => {
    if (!value.startTime || !value.endTime) {
      return;
    }

    const start = new Date(value.startTime);
    const end = new Date(value.endTime);

    if (start.getTime() >= end.getTime()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endTime"],
        message: "endTime must be after startTime",
      });
    }
  });

export function isAuthorizedCronRequest(request: Request): boolean {
  const cronSecret = request.headers.get("x-cron-secret");
  const authHeader = request.headers.get("authorization");

  if (cronSecret && cronSecret === env.CRON_SECRET) {
    return true;
  }

  if (authHeader?.startsWith("Bearer ")) {
    const bearerToken = authHeader.slice("Bearer ".length).trim();
    return bearerToken === env.CRON_SECRET;
  }

  return false;
}

export function resolveDateRange(input: { startTime?: string; endTime?: string }): {
  startTime: Date;
  endTime: Date;
} {
  const parsed = DateRangeSchema.parse(input);
  const endTime = parsed.endTime ? new Date(parsed.endTime) : new Date();
  const startTime = parsed.startTime
    ? new Date(parsed.startTime)
    : new Date(endTime.getTime() - 24 * 60 * 60 * 1000);

  if (startTime.getTime() >= endTime.getTime()) {
    throw new z.ZodError([
      {
        code: z.ZodIssueCode.custom,
        path: ["endTime"],
        message: "endTime must be after startTime",
      },
    ]);
  }

  return { startTime, endTime };
}

function summarizeStatus(successfulDevices: number, partialDevices: number, failedDevices: number): IngestionStatus {
  if (failedDevices === 0 && partialDevices === 0) {
    return "success";
  }

  if (successfulDevices > 0 || partialDevices > 0) {
    return "partial";
  }

  return "failed";
}

export function summarizeIngestionResults(results: IngestionResult[]) {
  const successfulDevices = results.filter((result) => result.status === "success").length;
  const partialDevices = results.filter((result) => result.status === "partial").length;
  const failedDevices = results.filter((result) => result.status === "failed").length;
  const totalRecords = results.reduce((sum, result) => sum + result.recordCount, 0);
  const totalErrors = results.reduce((sum, result) => sum + result.errorCount, 0);

  return {
    status: summarizeStatus(successfulDevices, partialDevices, failedDevices),
    successfulDevices,
    partialDevices,
    failedDevices,
    totalRecords,
    totalErrors,
  };
}