import { SignJWT } from "jose";

import { env } from "@/lib/env";
import type { Role } from "@/lib/types";

const SESSION_COOKIE = "session";
const SESSION_TTL_SECONDS = 60 * 60 * 24;
const jwtSecret = new TextEncoder().encode(env.JWT_SECRET);

export type SessionRole = Role;

export type SessionPayload = {
  userId: number;
  role: SessionRole;
};

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(jwtSecret);
}

export const sessionCookie = {
  name: SESSION_COOKIE,
  maxAge: SESSION_TTL_SECONDS,
} as const;
