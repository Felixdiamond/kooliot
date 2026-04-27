import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Shield, Users } from "lucide-react";

import { PageHeader } from "@/components/shared/PageHeader";
import { AccessGrantForm } from "@/components/admin/access-grant-form";
import { RevokeAccessButton } from "@/components/admin/revoke-access-button";
import { db } from "@/db/client";
import { accessGrants, devices, users } from "@/db/schema";
import { formatBoardTypeLabel } from "@/lib/domain/boards";

export default async function AccessManagementPage() {
  const requestHeaders = await headers();
  const userRole = requestHeaders.get("x-user-role");

  if (userRole !== "ADMIN") {
    redirect("/dashboard");
  }

  const [allUsers, allDevices, grants] = await Promise.all([
    db
      .select({ id: users.id, email: users.email, name: users.name })
      .from(users)
      .orderBy(users.name),
    db
      .select({ id: devices.id, serialNumber: devices.serialNumber, boardType: devices.boardType })
      .from(devices)
      .orderBy(devices.serialNumber),
    db
      .select({
        id: accessGrants.id,
        userId: accessGrants.userId,
        deviceId: accessGrants.deviceId,
        role: accessGrants.role,
        createdAt: accessGrants.createdAt,
        userName: users.name,
        userEmail: users.email,
        deviceSerial: devices.serialNumber,
        deviceBoardType: devices.boardType,
      })
      .from(accessGrants)
      .innerJoin(users, eq(accessGrants.userId, users.id))
      .innerJoin(devices, eq(accessGrants.deviceId, devices.id)),
  ]);

  return (
    <div>
      <PageHeader
        title="Access Management"
        subtitle="Control user permissions and device access"
      />

      <div className="surface-card relative mb-8 overflow-hidden p-6">
        <div className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-md border border-quaternary/25 bg-quaternary/14 text-quaternary">
          <Shield size={18} strokeWidth={2.25} />
        </div>
        <p className="pr-10 text-sm leading-relaxed text-muted-foreground">
          Manage user-device access grants and role assignments. Grant or revoke permissions for users to control specific devices.
        </p>
      </div>

      <div className="mb-10">
        <AccessGrantForm
          users={allUsers.map((user) => ({ id: user.id, label: `${user.name} (${user.email})` }))}
          devices={allDevices.map((device) => ({
            id: device.id,
            label: `${device.serialNumber} (${formatBoardTypeLabel(device.boardType)})`,
          }))}
        />
      </div>

      <div className="surface-card overflow-hidden">
        <div className="flex items-center gap-3 border-b border-border bg-muted/45 px-6 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-md border border-primary/25 bg-primary/12 text-primary">
            <Users size={16} strokeWidth={2.25} />
          </div>
          <h2 className="font-heading text-sm font-semibold uppercase tracking-wide text-foreground">
            Current Grants
          </h2>
        </div>

        {grants.length === 0 ? (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-lg border border-border bg-muted/45">
              <Shield size={24} strokeWidth={2} className="text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm font-medium">
              No access grants found.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/45">
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    User
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Device
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Role
                  </th>
                  <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Created
                  </th>
                  <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {grants.map((grant) => (
                  <tr key={grant.id} className="border-b border-border/75 transition-colors hover:bg-muted/25">
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-foreground">{grant.userName}</div>
                      <div className="text-xs text-muted-foreground font-medium">{grant.userEmail}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-foreground">{grant.deviceSerial}</div>
                      <div className="text-xs text-muted-foreground font-medium">{formatBoardTypeLabel(grant.deviceBoardType)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase text-primary">
                        {grant.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {grant.createdAt.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <RevokeAccessButton userId={grant.userId} deviceId={grant.deviceId} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
