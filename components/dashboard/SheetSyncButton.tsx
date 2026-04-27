'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/Button';

export function SheetSyncButton() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string>('');
  const [isError, setIsError] = useState(false);

  function runSync() {
    startTransition(async () => {
      setMessage('');
      setIsError(false);

      try {
        const response = await fetch('/api/admin/sync/sheets', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ includeDefaultDirectory: true }),
        });

        const payload = (await response.json().catch(() => ({}))) as {
          summary?: { created?: number; updated?: number; skipped?: number };
          error?: string;
          message?: string;
        };

        if (!response.ok) {
          setIsError(true);
          setMessage(payload.error ?? payload.message ?? 'Sheet sync failed');
          return;
        }

        const summary = payload.summary;
        setMessage(
          `Sheet sync complete: ${summary?.created ?? 0} created, ${summary?.updated ?? 0} updated, ${summary?.skipped ?? 0} skipped.`
        );
        router.refresh();
      } catch {
        setIsError(true);
        setMessage('Unable to run sheet sync right now.');
      }
    });
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button variant="secondary" onClick={runSync} disabled={isPending} isLoading={isPending}>
        Sync Sheet Inventory
      </Button>
      {message ? (
        <p className={`text-xs font-medium ${isError ? 'text-status-error' : 'text-status-active'}`}>
          {message}
        </p>
      ) : null}
    </div>
  );
}
