import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Zap } from "lucide-react";

import { StatCard } from "@/components/dashboard/StatCard";
import { getDashboardKPIs, getRecentActivations, getProductTypeBreakdown } from "@/lib/services/activationService";
import { SheetSyncButton } from "@/components/dashboard/SheetSyncButton";
import { ProductTypeChart } from "@/components/dashboard/ProductTypeChart";
import { Button } from "@/components/ui/Button";
import { listFreeDevices } from "@/lib/services/deviceService";
import { listOpenAssignmentTasks } from "@/lib/services/taskService";

export default async function DashboardPage() {
  const requestHeaders = await headers();
  const userId = Number(requestHeaders.get("x-user-id"));
  const userRole = requestHeaders.get("x-user-role") ?? "VIEWER";

  if (!Number.isInteger(userId) || userId <= 0) {
    redirect("/login");
  }

  if (userRole === "VIEWER") {
    const [kpis, recentActivations, productTypes] = await Promise.all([
      getDashboardKPIs(),
      getRecentActivations(10),
      getProductTypeBreakdown(),
    ]);

    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4">
          <div>
            <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
              Viewer Dashboard
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-muted-foreground sm:text-base">
              Monitor activity and submit board assignment requests from the assignments workspace.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/devices">
              <Button variant="primary">Manage Devices</Button>
            </Link>
            <Link href="/assignments">
              <Button variant="secondary">Board Assignments</Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            label="Total Devices"
            value={kpis.totalDevices}
            iconName="cpu"
            meta="in fleet"
          />
          <StatCard
            label="Activations Today"
            value={kpis.activationsToday}
            iconName="zap"
            meta="tokens generated"
          />
          <StatCard
            label="Open Assignments"
            value={0}
            iconName="battery"
            meta="check assignments page"
          />
          <StatCard
            label="My Requests"
            value={0}
            iconName="activity"
            meta="from assignments"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="surface-card h-100 p-6">
              <h2 className="font-heading text-lg font-semibold text-foreground">Inventory by Product Type</h2>
              <ProductTypeChart data={productTypes} />
            </div>
          </div>

          <div className="space-y-6">
            <div className="surface-card flex h-100 flex-col overflow-hidden p-6">
              <div className="mb-4 flex shrink-0 items-center justify-between">
                <h2 className="font-heading text-lg font-semibold text-foreground">Recent Activations</h2>
                <div className="rounded-md border border-border bg-muted p-2">
                  <Zap size={18} className="text-muted-foreground" />
                </div>
              </div>

              <div className="grow overflow-y-auto pr-2">
                <div className="space-y-4">
                  {recentActivations.length === 0 ? (
                    <p className="flex h-24 items-center justify-center rounded-lg bg-muted/40 text-sm text-muted-foreground">
                      No recent activations found.
                    </p>
                  ) : (
                    recentActivations.map((act) => (
                      <div key={act.id} className="rounded-lg border border-border/70 bg-muted/25 p-3 transition-colors hover:border-primary/30">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold tracking-tight text-foreground">{act.deviceSerial}</span>
                          <span className="rounded-full bg-status-active/12 px-2 py-0.5 text-xs font-semibold text-status-active">
                            +{act.days} days
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <span className="max-w-30 truncate" title={act.generatedBy}>{act.generatedBy}</span>
                          <span className="font-medium">{new Date(act.activatedAt).toLocaleDateString()}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const [kpis, recentActivations, productTypes] = await Promise.all([
    getDashboardKPIs(),
    getRecentActivations(10),
    getProductTypeBreakdown(),
  ]);

  const [openTasksRaw, freeDevices] = await Promise.all([
    listOpenAssignmentTasks(),
    listFreeDevices(),
  ]);

  const openAssignments = openTasksRaw.length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-4">
        <div>
          <h1 className="font-heading text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Operations Dashboard
          </h1>
          <p className="mt-2 max-w-3xl text-sm text-muted-foreground sm:text-base">
            Monitor PAYG device activations and fleet status across your organization.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/devices">
             <Button variant="primary">Manage Devices</Button>
          </Link>
          <Link href="/assignments">
             <Button variant="secondary">Board Assignments</Button>
          </Link>
          <SheetSyncButton />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          label="Total Devices"
          value={kpis.totalDevices}
          iconName="cpu"
          trend={{ value: "+migrate", direction: "up" }}
          meta="in fleet"
        />
        <StatCard
          label="Activations Today"
          value={kpis.activationsToday}
          iconName="zap"
          meta="tokens generated"
        />
        <StatCard
          label="Free Boards"
          value={freeDevices.length}
          iconName="activity"
          status="active"
          meta="ready for assignment"
        />
        <StatCard
          label="Open Assignments"
          value={openAssignments}
          iconName="battery"
          meta="pending tasks"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
           <div className="surface-card h-100 p-6">
             <h2 className="font-heading text-lg font-semibold text-foreground">Inventory by Product Type</h2>
             <ProductTypeChart data={productTypes} />
           </div>
        </div>

        <div className="space-y-6">
           <div className="surface-card flex h-100 flex-col overflow-hidden p-6">
             <div className="mb-4 flex shrink-0 items-center justify-between">
               <h2 className="font-heading text-lg font-semibold text-foreground">Recent Activations</h2>
               <div className="rounded-md border border-border bg-muted p-2">
                 <Zap size={18} className="text-muted-foreground" />
               </div>
             </div>
             
             <div className="grow overflow-y-auto pr-2">
               <div className="space-y-4">
                 {recentActivations.length === 0 ? (
                   <p className="flex h-24 items-center justify-center rounded-lg bg-muted/40 text-sm text-muted-foreground">
                     No recent activations found.
                   </p>
                 ) : (
                   recentActivations.map((act) => (
                     <div key={act.id} className="rounded-lg border border-border/70 bg-muted/25 p-3 transition-colors hover:border-primary/30">
                       <div className="flex items-center justify-between">
                         <span className="text-sm font-semibold tracking-tight text-foreground">{act.deviceSerial}</span>
                         <span className="rounded-full bg-status-active/12 px-2 py-0.5 text-xs font-semibold text-status-active">
                           +{act.days} days
                         </span>
                       </div>
                       <div className="flex items-center justify-between text-xs text-muted-foreground">
                         <span className="max-w-30 truncate" title={act.generatedBy}>{act.generatedBy}</span>
                         <span className="font-medium">{new Date(act.activatedAt).toLocaleDateString()}</span>
                       </div>
                     </div>
                   ))
                 )}
               </div>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
}
