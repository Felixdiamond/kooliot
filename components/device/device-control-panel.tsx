"use client";

import { useState, useTransition } from "react";

import { disableDeviceAction, enableDeviceAction } from "@/lib/actions/deviceControl";
import { isRemoteCapableBoard } from "@/lib/domain/boards";
import { GlassButton } from "@/components/ui/glass-button";
import { GlassCard } from "@/components/ui/glass-card";

type DeviceControlPanelProps = {
  deviceId: number;
  boardType: string;
  isViewer: boolean;
};

export function DeviceControlPanel({ deviceId, boardType, isViewer }: DeviceControlPanelProps) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string>("");
  const [isError, setIsError] = useState(false);

  function runAction(action: "enable" | "disable") {
    startTransition(async () => {
      const result =
        action === "enable"
          ? await enableDeviceAction(deviceId)
          : await disableDeviceAction(deviceId);

      setIsError(!result.success);
      setMessage(result.message);
    });
  }

  if (!isRemoteCapableBoard(boardType)) {
    return (
      <GlassCard className="p-5">
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Device Control</h3>
        <p className="mt-3 text-sm text-slate-700 dark:text-slate-300">
          Remote control is not supported for PAYGO boards.
        </p>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-5">
      <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">Device Control</h3>

      <div className="mt-4 flex flex-wrap gap-3">
        <GlassButton
          onClick={() => runAction("enable")}
          disabled={isPending || isViewer}
          variant="primary"
        >
          Enable Device
        </GlassButton>
        <GlassButton
          onClick={() => runAction("disable")}
          disabled={isPending || isViewer}
          variant="danger"
        >
          Disable Device
        </GlassButton>
      </div>

      {isViewer ? (
        <p className="mt-3 text-sm text-amber-700 dark:text-amber-300">
          VIEWER role cannot issue control commands.
        </p>
      ) : null}

      {message ? (
        <p className={isError ? "mt-3 text-sm text-rose-700 dark:text-rose-300" : "mt-3 text-sm text-emerald-700 dark:text-emerald-300"}>
          {message}
        </p>
      ) : null}
    </GlassCard>
  );
}