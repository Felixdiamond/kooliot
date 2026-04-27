import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";

import { syncInventoryFromSheets } from "@/lib/services/sheetInventorySync";

const SheetSyncRequestSchema = z.object({
  workbookPaths: z.array(z.string().trim().min(1)).optional(),
  includeDefaultDirectory: z.boolean().optional(),
});

export async function POST(request: Request) {
  const requestHeaders = await headers();
  const userId = Number(requestHeaders.get("x-user-id"));
  const userRole = requestHeaders.get("x-user-role");

  if (!Number.isInteger(userId) || userId <= 0) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (userRole !== "ADMIN" && userRole !== "MANAGER") {
    return NextResponse.json(
      { error: "Only ADMIN or MANAGER can sync sheet inventory" },
      { status: 403 }
    );
  }

  try {
    const body = request.headers.get("content-type")?.includes("application/json")
      ? ((await request.json()) as unknown)
      : {};
    const parsed = SheetSyncRequestSchema.parse(body);

    const summary = await syncInventoryFromSheets({
      workbookPaths: parsed.workbookPaths,
      includeDefaultDirectory: parsed.includeDefaultDirectory,
      grantUserId: userId,
      grantRole: userRole,
      grantedBy: userId,
    });

    return NextResponse.json({
      provider: "sheet_inventory",
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
        error: "Sheet inventory sync failed",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
