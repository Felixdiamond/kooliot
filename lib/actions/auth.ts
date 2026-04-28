"use server";

import { cookies } from "next/headers";
import { eq, sql } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { db } from "@/db/client";
import { users } from "@/db/schema";
import { createSessionToken, type SessionRole, sessionCookie } from "@/lib/auth/session";
import { logAuthAttempt, withQueryLogging } from "@/lib/logging/logger";
import type { Role } from "@/lib/types";

const emailSchema = z.email();

const RegisterUserSchema = z.object({
  email: emailSchema,
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(255),
  role: z.enum(["ADMIN", "MANAGER", "VIEWER"]).default("VIEWER"),
});

const LoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(8).max(128),
});

type ActionResult = { success: true } | { success: false; error: string };

async function setSessionCookie(userId: number, role: SessionRole): Promise<void> {
  const token = await createSessionToken({ userId, role });
  const cookieStore = await cookies();

  cookieStore.set(sessionCookie.name, token, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: sessionCookie.maxAge,
    path: "/",
  });
}

export async function registerUserAction(formData: FormData): Promise<ActionResult> {
  try {
  const parsed = RegisterUserSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    name: formData.get("name"),
    role: formData.get("role") ?? "VIEWER",
  });

  if (!parsed.success) {
    logAuthAttempt({
      username: String(formData.get("email") ?? "unknown"),
      result: "failure",
      reason: "invalid_register_payload",
    });
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { email, password, name, role } = parsed.data;
  const existingUser = await withQueryLogging("auth.register.find_user", () =>
    db.query.users.findFirst({ where: eq(users.email, email) })
  );

  if (existingUser) {
    logAuthAttempt({ username: email, result: "failure", reason: "user_exists" });
    return { success: false, error: "User already exists" };
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const createdUsers = await withQueryLogging("auth.register.insert_user", () =>
    db.transaction(async (tx) => {
      const [{ count }] = await tx.select({ count: sql<number>`count(*)` }).from(users);
      const assignedRole = Number(count) === 0 ? "ADMIN" : role;

      return tx
        .insert(users)
        .values({
          email,
          passwordHash,
          name,
          role: assignedRole,
        })
        .returning({ id: users.id, role: users.role });
    })
  );

  const createdUser = createdUsers[0];

  if (!createdUser) {
    logAuthAttempt({ username: email, result: "failure", reason: "create_failed" });
    return { success: false, error: "Failed to create user" };
  }

  await setSessionCookie(createdUser.id, createdUser.role as Role);
  logAuthAttempt({ username: email, result: "success" });

  return { success: true };
  } catch (error) {
    logAuthAttempt({ username: String(formData.get("email") ?? "unknown"), result: "failure", reason: "unexpected_error" });
    logError("auth.register.unexpected", error);
    return { success: false, error: "Registration failed. Please try again." };
  }
}

export async function loginAction(formData: FormData): Promise<ActionResult> {
  try {
  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    logAuthAttempt({
      username: String(formData.get("email") ?? "unknown"),
      result: "failure",
      reason: "invalid_login_payload",
    });
    return { success: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const { email, password } = parsed.data;
  const user = await withQueryLogging("auth.login.find_user", () =>
    db.query.users.findFirst({ where: eq(users.email, email) })
  );

  if (!user) {
    logAuthAttempt({ username: email, result: "failure", reason: "user_not_found" });
    return { success: false, error: "Invalid credentials" };
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatches) {
    logAuthAttempt({ username: email, result: "failure", reason: "invalid_password" });
    return { success: false, error: "Invalid credentials" };
  }

  await setSessionCookie(user.id, (user.role as Role) ?? "VIEWER");
  logAuthAttempt({ username: email, result: "success" });

  return { success: true };
  } catch (error) {
    logAuthAttempt({ username: String(formData.get("email") ?? "unknown"), result: "failure", reason: "unexpected_error" });
    logError("auth.login.unexpected", error);
    return { success: false, error: "Sign-in failed. Please try again." };
  }
}
