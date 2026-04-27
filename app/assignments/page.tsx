import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";

import { ManagerTaskPanel } from "@/components/dashboard/ManagerTaskPanel";
import { PageHeader } from "@/components/shared/PageHeader";
import { ViewerTaskPanel } from "@/components/dashboard/ViewerTaskPanel";
import { Button } from "@/components/ui/Button";
import { listFreeDevices } from "@/lib/services/deviceService";
import { listOpenAssignmentTasks, listViewerTasks } from "@/lib/services/taskService";

export default async function AssignmentsPage() {
  const requestHeaders = await headers();
  const userId = Number(requestHeaders.get("x-user-id"));
  const userRole = requestHeaders.get("x-user-role") ?? "VIEWER";

  if (!Number.isInteger(userId) || userId <= 0) {
    redirect("/login");
  }

  const viewerTasksRaw = await listViewerTasks(userId);
  const viewerTasks = viewerTasksRaw.map((task) => ({
    ...task,
    payload: (task.payload as Record<string, unknown> | null) ?? null,
    createdAt: task.createdAt.toISOString(),
    completedAt: task.completedAt ? task.completedAt.toISOString() : null,
  }));

  if (userRole === "VIEWER") {
    const freeDevices = await listFreeDevices();

    return (
      <div className="space-y-6">
        <PageHeader
          title="Board Registration & Assignments"
          subtitle="Create registration or assignment requests and track progress"
          actions={
            <Link href="/dashboard">
              <Button variant="secondary">Back to Dashboard</Button>
            </Link>
          }
        />

        <ViewerTaskPanel tasks={viewerTasks} freeDevices={freeDevices} />
      </div>
    );
  }

  const [openTasksRaw, freeDevices] = await Promise.all([
    listOpenAssignmentTasks(),
    listFreeDevices(),
  ]);

  const openTasks = openTasksRaw.map((task) => ({
    ...task,
    payload: (task.payload as Record<string, unknown> | null) ?? null,
    createdAt: task.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Board Registration & Assignments"
        subtitle="Register boards from open requests, delete stale tasks, or submit new registration/assignment requests"
        actions={
          <div className="flex items-center gap-2">
            <Link href="/devices/register">
              <Button>Register Device</Button>
            </Link>
            <Link href="/dashboard">
              <Button variant="secondary">Back to Dashboard</Button>
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ManagerTaskPanel tasks={openTasks} freeDevices={freeDevices} />
        <ViewerTaskPanel tasks={viewerTasks} freeDevices={freeDevices} />
      </div>
    </div>
  );
}
