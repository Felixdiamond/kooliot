import { headers } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Info } from "lucide-react";

import { PageHeader } from "@/components/shared/PageHeader";
import { DeviceRegistrationForm } from "@/components/device/device-registration-form";

export default async function DeviceRegisterPage() {
  const requestHeaders = await headers();
  const userRole = requestHeaders.get("x-user-role");

  if (userRole !== "ADMIN" && userRole !== "MANAGER") {
    redirect("/dashboard");
  }

  return (
    <div>
      <div className="mb-6 flex items-center gap-2 text-sm font-medium text-muted-foreground">
        <Link href="/devices" className="hover:text-foreground transition-colors">
          Devices
        </Link>
        <ChevronRight size={16} strokeWidth={2.5} />
        <span className="font-semibold text-foreground">Register</span>
      </div>

      <PageHeader
        title="Register Device"
        subtitle="Map boards to customers or add new inventory"
      />

      <div className="w-full">
        <div className="surface-card relative mb-8 overflow-hidden p-6">
          <div className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-md border border-quaternary/25 bg-quaternary/14 text-quaternary">
            <Info size={18} strokeWidth={2.25} />
          </div>
          <p className="pr-10 text-sm leading-relaxed text-muted-foreground">
            Cloud PayGo boards are the only remotely controlled IoT boards.
            Use this page to register customer assignments by ID and manage PAYGO inventory records.
          </p>
        </div>

        <DeviceRegistrationForm />
      </div>
    </div>
  );
}
