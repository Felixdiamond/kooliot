"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { createAccessGrantAction } from "@/lib/actions/accessGrant";
import { Button } from "@/components/ui/Button";

type Option = {
  id: number;
  label: string;
};

type AccessGrantFormProps = {
  users: Option[];
};

export function AccessGrantForm({ users }: AccessGrantFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string>("");
  const [isError, setIsError] = useState(false);

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createAccessGrantAction(formData);
      setIsError(!result.success);
      setMessage(result.message);
      if (result.success) {
        router.refresh();
      }
    });
  }

  return (
    <div className="surface-card p-6">
      <h2 className="mb-4 text-[13px] font-semibold uppercase tracking-wide text-foreground">
        Create Access Grant
      </h2>

      <form action={onSubmit} className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div>
          <label className="font-mono-data mb-2 block text-[11px] uppercase tracking-wide text-muted-foreground">
            User
          </label>
          <select
            name="userId"
            disabled={isPending}
            className="h-10 w-full rounded-md border border-border bg-input px-3 text-[13px] text-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 disabled:opacity-50"
          >
            <option value="">Select user</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="font-mono-data mb-2 block text-[11px] uppercase tracking-wide text-muted-foreground">
            Role
          </label>
          <select
            name="role"
            defaultValue="VIEWER"
            disabled={isPending}
            className="h-10 w-full rounded-md border border-border bg-input px-3 text-[13px] text-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 disabled:opacity-50"
          >
            <option value="ADMIN">ADMIN</option>
            <option value="MANAGER">MANAGER</option>
            <option value="VIEWER">VIEWER</option>
          </select>
        </div>

        <div className="flex items-end">
          <Button type="submit" disabled={isPending} isLoading={isPending} className="w-full">
            Create Grant
          </Button>
        </div>
      </form>

      {message && (
        <div
          className={`mt-4 p-3 rounded-md text-[13px] ${
            isError
              ? "border border-status-error/30 bg-status-error/10 text-status-error"
              : "border border-status-active/30 bg-status-active/10 text-status-active"
          }`}
        >
          {message}
        </div>
      )}
    </div>
  );
}
