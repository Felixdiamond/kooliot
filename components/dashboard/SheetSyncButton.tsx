'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/toaster';

export function SheetSyncButton() {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();

  function runSync() {
    startTransition(async () => {
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
          toast('error', payload.error ?? payload.message ?? 'Sheet sync failed');
          return;
        }

        const summary = payload.summary;
        toast(
          'success',
          `Sheet sync complete: ${summary?.created ?? 0} created, ${summary?.updated ?? 0} updated, ${summary?.skipped ?? 0} skipped.`
        );
        router.refresh();
      } catch {
        toast('error', 'Unable to run sheet sync right now.');
      }
    });
  }

  return (
    <Button variant="secondary" onClick={runSync} disabled={isPending} isLoading={isPending}>
      Sync Sheet Inventory
    </Button>
  );
}
