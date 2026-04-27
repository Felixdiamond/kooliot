import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { syncCloudSolarDevices } from "@/lib/services/deviceSync";

const CloudSolarSyncRequestSchema = z.object({
  deviceIds: z.array(z.string().trim().min(1)).optional(),
});

export async function POST(request: Request) {
  const requestHeaders = await headers();
  const userId = Number(requestHeaders.get("x-user-id"));
  const userRole = requestHeaders.get("x-user-role");

  if (!Number.isInteger(userId) || userId <= 0) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (userRole !== "ADMIN") {
    return NextResponse.json({ error: "Only ADMIN can sync devices" }, { status: 403 });
  }

  try {
    const parsed = request.body ? CloudSolarSyncRequestSchema.parse(await request.json().catch(() => ({}))) : {};

    const summary = await syncCloudSolarDevices({
      deviceIds: parsed.deviceIds,
      grantUserId: userId,
      grantRole: "ADMIN",
      grantedBy: userId,
    });

    return NextResponse.json({
      provider: "cloud_solar",
      status: "success",
      summary,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        {
          error: "Invalid request payload",
          details: error.issues.map((issue) => ({ path: issue.path, message: issue.message })),
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        error: "Cloud Solar sync failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
