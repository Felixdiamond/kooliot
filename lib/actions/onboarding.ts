"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { syncInventoryFromSheets } from "@/lib/services/sheetInventorySync";

export async function runOnboardingSyncAction(): Promise<void> {
  const requestHeaders = await headers();
  const userId = Number(requestHeaders.get("x-user-id"));
  const role = requestHeaders.get("x-user-role");

  if (!Number.isInteger(userId) || userId <= 0) {
    return;
  }

  if (role !== "ADMIN") {
    return;
  }

  try {
    await syncInventoryFromSheets({
      grantUserId: userId,
      grantRole: "ADMIN",
      grantedBy: userId,
    });

    revalidatePath("/dashboard");
  } catch {
    return;
  }
}
