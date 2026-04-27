import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { importInnovexDevices } from "@/lib/services/deviceSync";

const InnovexSyncRequestSchema = z.object({
  includeApi: z.boolean().optional(),
  csvPaths: z.array(z.string().trim().min(1)).optional(),
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
    const body = request.headers.get("content-type")?.includes("application/json")
      ? ((await request.json()) as unknown)
      : {};
    const parsed = InnovexSyncRequestSchema.parse(body);

    const summary = await importInnovexDevices({
      includeApi: parsed.includeApi,
      csvPaths: parsed.csvPaths,
      grantUserId: userId,
      grantRole: "ADMIN",
      grantedBy: userId,
    });

    return NextResponse.json({
      provider: "innovex",
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
        error: "Innovex sync failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
