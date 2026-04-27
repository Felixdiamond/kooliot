import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Plus, Cpu, Search, ChevronLeft, ChevronRight } from "lucide-react";

import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { StatusBadge } from "@/components/devices/StatusBadge";
import { DeviceCopyAction } from "@/components/devices/DeviceCopyAction";
import { formatBoardTypeLabel } from "@/lib/domain/boards";
import { listAllDevices, countAllDevices, listUserDevices } from "@/lib/services/accessControl";

const PAGE_SIZE = 50;

export default async function DevicesPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const requestHeaders = await headers();
  const userId = Number(requestHeaders.get("x-user-id"));
  const userRole = requestHeaders.get("x-user-role") ?? "VIEWER";

  if (!Number.isInteger(userId) || userId <= 0) {
    redirect("/login");
  }

  const params = await searchParams;
  const search = typeof params.search === "string" ? params.search : "";
  const rawPage = typeof params.page === "string" ? Number(params.page) : 1;
  const requestedPage = Number.isFinite(rawPage) && rawPage > 0 ? Math.floor(rawPage) : 1;

  const isAdmin = userRole === "ADMIN" || userRole === "MANAGER";

  let deviceList: Awaited<ReturnType<typeof listAllDevices>>;
  let totalCount: number;
  let totalPages = 1;
  let page = requestedPage;
  let offset = 0;

  if (isAdmin) {
    totalCount = await countAllDevices(search);
    totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
    page = Math.min(requestedPage, totalPages);
    offset = (page - 1) * PAGE_SIZE;
    deviceList = await listAllDevices({ search, limit: PAGE_SIZE, offset });
  } else {
    // Non-admins only see their granted devices
    const allGranted = await listUserDevices(userId);
    const filtered = search
      ? allGranted.filter(
          (d) =>
            d.serialNumber.toLowerCase().includes(search.toLowerCase()) ||
            (d.angazaId && d.angazaId.toLowerCase().includes(search.toLowerCase())) ||
            (d.paygoId && d.paygoId.toLowerCase().includes(search.toLowerCase()))
        )
      : allGranted;
    totalCount = filtered.length;
    totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
    page = Math.min(requestedPage, totalPages);
    offset = (page - 1) * PAGE_SIZE;
    deviceList = filtered.slice(offset, offset + PAGE_SIZE);
  }

  const canRegister = isAdmin;

  function toStatusBadge(status: string | null): {
    status: "active" | "offline" | "warning" | "pending" | "error";
    label?: string;
    pulse: boolean;
  } | null {
    if (!status) {
      return null;
    }

    if (status === "active") {
      return { status: "active", pulse: true };
    }

    if (status === "inactive" || status === "offline") {
      return { status: "offline", label: "Inactive", pulse: false };
    }

    if (status === "error") {
      return { status: "error", pulse: false };
    }

    if (status === "pending") {
      return { status: "pending", pulse: false };
    }

    return { status: "warning", label: status, pulse: false };
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Devices"
        subtitle={`${totalCount.toLocaleString()} registered devices`}
        actions={
          <div className="flex flex-wrap items-center gap-3">
            <form action="/devices" method="get" className="relative w-full min-w-64 sm:w-80">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search size={16} className="text-muted-foreground" />
              </div>
              <Input
                name="search"
                placeholder="Search by serial, Angaza ID, PayGo ID, or product..."
                defaultValue={search}
                className="pl-9 h-10 border-border bg-card"
              />
              {/* preserve page=1 on new search */}
              <input type="hidden" name="page" value="1" />
            </form>
            {canRegister && (
              <Link href="/devices/register">
                <Button variant="primary" size="md">
                  <Plus size={18} strokeWidth={2.5} className="mr-2" />
                  Register Device
                </Button>
              </Link>
            )}
          </div>
        }
      />

      <div className="surface-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/45 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <th className="px-6 py-4 text-left">Serial Number</th>
                <th className="px-6 py-4 text-left">Angaza / Unit</th>
                <th className="px-6 py-4 text-left">PayGo ID</th>
                <th className="px-6 py-4 text-left">Board</th>
                <th className="px-6 py-4 text-left">Assignment</th>
                <th className="px-6 py-4 text-left">Customer</th>
                <th className="px-6 py-4 text-left">Status</th>
                <th className="px-6 py-4 text-left">Activations</th>
                <th className="px-6 py-4 text-left">Last Activated</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {deviceList.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-16 h-16 bg-muted border border-border rounded-xl flex items-center justify-center">
                        <Cpu size={28} strokeWidth={2} className="text-muted-foreground" />
                      </div>
                      <p className="text-muted-foreground font-medium">
                        {search ? `No devices match "${search}"` : "No devices found"}
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                deviceList.map((device) => (
                  <tr key={device.id} className="border-b border-border/80 transition-colors hover:bg-muted/25">
                    <td className="px-6 py-4">
                      <Link
                        href={`/devices/${device.id}`}
                        className="font-mono-data text-sm font-semibold text-foreground transition-colors hover:text-primary"
                      >
                        {device.serialNumber}
                      </Link>
                    </td>
                    <td className="px-6 py-4 font-mono text-sm text-muted-foreground">
                      {device.angazaId || "—"}
                    </td>
                    <td className="px-6 py-4 font-mono text-sm text-muted-foreground">
                      {device.paygoId || "—"}
                    </td>
                    <td className="px-6 py-4 text-xs text-muted-foreground font-medium">
                      {formatBoardTypeLabel(device.boardType)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {device.assignmentStatus === "ASSIGNED" ? (
                        <span className="inline-flex items-center rounded-full bg-status-active/12 px-2 py-1 text-xs font-semibold text-status-active">
                          ASSIGNED
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-status-warning/15 px-2 py-1 text-xs font-semibold text-foreground">
                          FREE
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {device.customerName || "—"}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {(() => {
                        const badge = toStatusBadge(device.status);

                        if (!badge) {
                          return <span className="text-muted-foreground">—</span>;
                        }

                        return (
                          <StatusBadge
                            status={badge.status}
                            label={badge.label}
                            pulse={badge.pulse}
                          />
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 font-bold text-sm">
                      {device.tokenCount}
                    </td>
                    <td className="px-6 py-4 text-sm text-muted-foreground">
                      {device.lastActivatedAt
                        ? new Date(device.lastActivatedAt).toLocaleDateString()
                        : "Never"}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <DeviceCopyAction
                          serialNumber={device.serialNumber}
                          angazaId={device.angazaId}
                          paygoId={device.paygoId}
                        />
                        <Link href={`/devices/${device.id}`}>
                          <Button variant="ghost" size="sm" className="text-primary hover:bg-primary/10">
                            View
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-border bg-muted/30 px-6 py-4">
            <p className="text-sm text-muted-foreground">
              Showing {offset + 1}–{Math.min(offset + PAGE_SIZE, totalCount)} of{" "}
              <span className="font-semibold text-foreground">{totalCount.toLocaleString()}</span> devices
            </p>
            <div className="flex items-center gap-2">
              {page > 1 && (
                <Link href={`/devices?search=${encodeURIComponent(search)}&page=1`}>
                  <Button variant="ghost" size="sm">
                    First
                  </Button>
                </Link>
              )}
              {page > 1 && (
                <Link href={`/devices?search=${encodeURIComponent(search)}&page=${page - 1}`}>
                  <Button variant="ghost" size="sm">
                    <ChevronLeft size={16} /> Prev
                  </Button>
                </Link>
              )}
              <span className="text-sm text-muted-foreground font-medium px-3">
                Page {page} / {totalPages}
              </span>
              {page < totalPages && (
                <Link href={`/devices?search=${encodeURIComponent(search)}&page=${page + 1}`}>
                  <Button variant="ghost" size="sm">
                    Next <ChevronRight size={16} />
                  </Button>
                </Link>
              )}
              {page < totalPages && (
                <Link href={`/devices?search=${encodeURIComponent(search)}&page=${totalPages}`}>
                  <Button variant="ghost" size="sm">
                    Last
                  </Button>
                </Link>
              )}

              <form action="/devices" method="get" className="flex items-center gap-2 ml-2">
                <input type="hidden" name="search" value={search} />
                <input
                  type="number"
                  name="page"
                  min={1}
                  max={totalPages}
                  defaultValue={page}
                  className="h-8 w-20 rounded-md border border-border bg-input px-2 text-sm text-foreground"
                />
                <Button type="submit" variant="secondary" size="sm">
                  Jump
                </Button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
