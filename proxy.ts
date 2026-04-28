import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

import { env } from "@/lib/env";
import { sessionCookie, type SessionPayload } from "@/lib/auth/session";

const jwtSecret = new TextEncoder().encode(env.JWT_SECRET);

function readTaskAssignmentApiKey(request: NextRequest): string | null {
  const authorization = request.headers.get("authorization") ?? "";

  if (authorization.toLowerCase().startsWith("bearer ")) {
    const token = authorization.slice(7).trim();
    if (token.length > 0) {
      return token;
    }
  }

  const headerToken = (request.headers.get("x-task-api-key") ?? "").trim();
  return headerToken.length > 0 ? headerToken : null;
}

function isTaskAssignmentApiKeyAuthorized(request: NextRequest): boolean {
  const configuredKey = env.TASK_ASSIGNMENT_API_KEY;
  if (!configuredKey) {
    return false;
  }

  const providedKey = readTaskAssignmentApiKey(request);
  return providedKey === configuredKey;
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const session = request.cookies.get(sessionCookie.name);
  const isApiRequest = request.nextUrl.pathname.startsWith("/api/");
  const isTaskAssignmentEndpoint = request.nextUrl.pathname === "/api/task-assignments";

  if (!session && isTaskAssignmentEndpoint && isTaskAssignmentApiKeyAuthorized(request)) {
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-task-api-auth", "1");

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  if (!session) {
    if (isApiRequest) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const { payload } = await jwtVerify(session.value, jwtSecret);
    const sessionPayload = payload as SessionPayload;

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-user-id", String(sessionPayload.userId));
    requestHeaders.set("x-user-role", sessionPayload.role);

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch {
    if (isApiRequest) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/assignments/:path*",
    "/devices/:path*",
    "/tokens/:path*",
    "/admin/:path*",
    "/api/admin/:path*",
    "/api/export/:path*",
    "/api/devices/:path*",
    "/api/tasks/:path*",
    "/api/task-assignments",
  ],
};
