import { get } from "@vercel/blob";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

// Narrow SSRF surface: only allow fetching from Vercel Blob private stores.
const VERCEL_PRIVATE_BLOB_PATTERN =
  /^https:\/\/[a-z0-9]+\.private\.blob\.vercel-storage\.com\//;

export async function GET(request: Request): Promise<NextResponse | Response> {
  const requestHeaders = await headers();
  const userId = Number(requestHeaders.get("x-user-id"));

  if (!Number.isInteger(userId) || userId <= 0) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const blobUrl = searchParams.get("url");

  if (!blobUrl || !VERCEL_PRIVATE_BLOB_PATTERN.test(blobUrl)) {
    return NextResponse.json({ error: "Invalid blob URL" }, { status: 400 });
  }

  const result = await get(blobUrl, { access: "private" });

  if (!result) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return new Response(result.stream, {
    status: result.statusCode,
    headers: {
      "Content-Type": result.blob.contentType ?? "application/octet-stream",
      // Instruct browser to display inline (for <img>), not download.
      "Content-Disposition": "inline",
      // Short private cache: authenticated per-user, not shared.
      "Cache-Control": "private, max-age=300",
    },
  });
}
