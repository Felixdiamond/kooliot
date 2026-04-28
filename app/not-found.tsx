import Link from "next/link";
import { Cpu } from "lucide-react";

import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="surface-elevated p-8 text-center">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-lg border border-border bg-muted text-muted-foreground">
            <Cpu size={24} strokeWidth={2} />
          </div>
          <h1 className="font-heading text-2xl font-semibold text-foreground">Page not found</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            The resource you're looking for doesn't exist or you don't have access to it.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link href="/dashboard">
              <Button variant="primary">Back to Dashboard</Button>
            </Link>
            <Link href="/devices">
              <Button variant="secondary">View Devices</Button>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
