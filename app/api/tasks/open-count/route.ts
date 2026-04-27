import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { countOpenAssignmentTasks } from "@/lib/services/taskService";

export async function GET() {
  const requestHeaders = await headers();
  const userId = Number(requestHeaders.get("x-user-id"));

  if (!Number.isInteger(userId) || userId <= 0) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const count = await countOpenAssignmentTasks();

  return NextResponse.json({ count });
}
