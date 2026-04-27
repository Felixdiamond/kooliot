"use client";

import { useState, useTransition } from "react";

import { generateTokenAction } from "@/lib/actions/generateToken";
import { GlassButton } from "@/components/ui/glass-button";
import { GlassCard } from "@/components/ui/glass-card";
import { GlassInput } from "@/components/ui/glass-input";
import { GlassSelect } from "@/components/ui/glass-select";

type TokenGeneratorFormProps = {
  deviceId: number;
  isViewer: boolean;
};

export function TokenGeneratorForm({ deviceId, isViewer }: TokenGeneratorFormProps) {
  const [isPending, startTransition] = useTransition();
  const [token, setToken] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [copied, setCopied] = useState(false);

  function onSubmit(formData: FormData) {
    setError("");
    setCopied(false);

    startTransition(async () => {
      const result = await generateTokenAction(formData);

      if (!result.success || !result.token) {
        setToken("");
        setError(result.error ?? "Failed to generate token");
        return;
      }

      setToken(result.token);
    });
  }

  async function copyToken() {
    if (!token) {
      return;
    }

    await navigator.clipboard.writeText(token);
    setCopied(true);
  }

  return (
    <GlassCard className="p-5">
      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Generate PAYG Token</h3>

      <form action={onSubmit} className="mt-4 space-y-3">
        <input type="hidden" name="deviceId" value={deviceId} />

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-800 dark:text-slate-200">
            Token Type
          </label>
          <GlassSelect name="tokenType" defaultValue="ADD_TIME" disabled={isViewer || isPending}>
            <option value="ACTIVATE">ACTIVATE</option>
            <option value="SET_TIME">SET_TIME</option>
            <option value="ADD_TIME">ADD_TIME</option>
            <option value="DISABLE">DISABLE</option>
          </GlassSelect>
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-800 dark:text-slate-200">
            Value (days)
          </label>
          <GlassInput
            name="value"
            type="number"
            min={1}
            max={995}
            defaultValue={30}
            disabled={isViewer || isPending}
          />
        </div>

        <GlassButton type="submit" disabled={isViewer || isPending} className="w-full">
          {isPending ? "Generating..." : "Generate Token"}
        </GlassButton>
      </form>

      {isViewer ? (
        <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">
          VIEWER role cannot generate tokens.
        </p>
      ) : null}

      {error ? <p className="mt-3 text-sm text-rose-700 dark:text-rose-300">{error}</p> : null}

      {token ? (
        <div className="mt-4 rounded-xl border border-emerald-300/50 bg-emerald-500/10 p-3">
          <p className="text-xs font-medium uppercase tracking-wide text-emerald-800 dark:text-emerald-200">
            Generated Token
          </p>
          <p className="mt-1 text-2xl font-semibold tracking-wider text-emerald-900 dark:text-emerald-100">
            {token}
          </p>
          <GlassButton variant="secondary" onClick={copyToken} className="mt-3">
            {copied ? "Copied" : "Copy to clipboard"}
          </GlassButton>
        </div>
      ) : null}
    </GlassCard>
  );
}