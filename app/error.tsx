"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/Button";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-2xl">
        <div className="surface-elevated p-8 text-center">
          <h1 className="font-heading text-2xl font-semibold text-foreground">Something went wrong</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            An unexpected error occurred. Please try again.
          </p>
          {error.digest && (
            <p className="mt-2 font-mono text-[11px] text-muted-foreground/60">ref: {error.digest}</p>
          )}
          <Button onClick={reset} className="mt-5">
            Try again
          </Button>
        </div>
      </div>
    </main>
  );
}