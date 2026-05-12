"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { revokeAccessGrantAction } from "@/lib/actions/accessGrant";
import { useToast } from "@/components/ui/toaster";
import { Button } from "@/components/ui/Button";

type RevokeAccessButtonProps = {
  userId: number;
};

export function RevokeAccessButton({ userId }: RevokeAccessButtonProps) {
  const router = useRouter();
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isConfirming, setIsConfirming] = useState(false);

  function onRevoke() {
    setIsConfirming(true);
  }

  function onConfirm() {
    setIsConfirming(false);
    const formData = new FormData();
    formData.set("userId", String(userId));

    startTransition(async () => {
      const result = await revokeAccessGrantAction(formData);
      toast(result.success ? "success" : "error", result.message);
      if (result.success) {
        router.refresh();
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      {isConfirming ? (
        <>
          <span className="text-xs text-muted-foreground">Revoke access?</span>
          <Button variant="danger" size="sm" onClick={onConfirm} disabled={isPending} isLoading={isPending}>
            Confirm
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setIsConfirming(false)} disabled={isPending}>
            Cancel
          </Button>
        </>
      ) : (
        <Button variant="secondary" size="sm" onClick={onRevoke} disabled={isPending} isLoading={isPending}>
          Revoke
        </Button>
      )}
    </div>
  );
}
