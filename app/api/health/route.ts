import { NextResponse } from "next/server";

import { sql } from "@/db/client";
import { env } from "@/lib/env";

export async function GET() {
  const timestamp = new Date().toISOString();
  let databaseConnected = false;
  let databaseError: string | null = null;

  try {
    await sql`select 1`;
    databaseConnected = true;
  } catch (error) {
    databaseConnected = false;
    databaseError = error instanceof Error ? error.message : "Unknown database error";
  }

  const cloudSolarConfigured = env.CLOUD_SOLAR_API_KEY.length > 0;
  const innovexConfigured = env.INNOVEX_API_TOKEN.length > 0;
  const status = databaseConnected ? "operational" : "degraded";

  return NextResponse.json(
    {
      status,
      timestamp,
      database: {
        connected: databaseConnected,
        error: databaseError,
      },
      upstream: {
        cloudSolarConfigured,
        innovexConfigured,
      },
    },
    { status: databaseConnected ? 200 : 503 }
  );
}