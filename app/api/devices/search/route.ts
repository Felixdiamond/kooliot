import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { searchDevices } from "@/lib/services/deviceService";

export async function GET(request: Request) {
  const requestHeaders = await headers();
  const userId = Number(requestHeaders.get("x-user-id"));

  if (!Number.isInteger(userId) || userId <= 0) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const query = (url.searchParams.get("q") ?? "").trim();

  if (!query) {
    return NextResponse.json({ results: [] });
  }

  const results = await searchDevices(userId, query);
  return NextResponse.json({ results });
}