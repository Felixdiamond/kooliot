"use client";

import { Button } from "@/components/ui/Button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error;
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background px-4 py-10">
        <div className="surface-elevated mx-auto max-w-2xl p-8 text-center">
          <h1 className="font-heading text-2xl font-semibold text-foreground">Critical Error</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            The app encountered a critical error. Please reload or try again.
          </p>
          <p className="mt-3 text-xs text-muted-foreground">{error.message}</p>
          <Button className="mt-5" onClick={reset}>
            Recover
          </Button>
        </div>
      </body>
    </html>
  );
}