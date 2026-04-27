"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { revokeAccessGrantAction } from "@/lib/actions/accessGrant";
import { Button } from "@/components/ui/Button";

type RevokeAccessButtonProps = {
  userId: number;
  deviceId: number;
};

export function RevokeAccessButton({ userId, deviceId }: RevokeAccessButtonProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string>("");

  function onRevoke() {
    const confirmed = window.confirm("Revoke this access grant?");
    if (!confirmed) {
      return;
    }

    const formData = new FormData();
    formData.set("userId", String(userId));
    formData.set("deviceId", String(deviceId));

    startTransition(async () => {
      const result = await revokeAccessGrantAction(formData);
      setMessage(result.message);
      if (result.success) {
        router.refresh();
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="secondary" size="sm" onClick={onRevoke} disabled={isPending} isLoading={isPending}>
        Revoke
      </Button>
      {message && <span className="text-[11px] text-[var(--text-secondary)]">{message}</span>}
    </div>
  );
}
