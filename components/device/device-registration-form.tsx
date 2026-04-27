"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { assignDeviceAction, registerDeviceAction } from "@/lib/actions/deviceRegistration";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function DeviceRegistrationForm() {
  const router = useRouter();
  const [isRegisterPending, startRegisterTransition] = useTransition();
  const [isAssignPending, startAssignTransition] = useTransition();
  const [registerMessage, setRegisterMessage] = useState<string>("");
  const [assignMessage, setAssignMessage] = useState<string>("");
  const [registerError, setRegisterError] = useState(false);
  const [assignError, setAssignError] = useState(false);

  function onRegister(formData: FormData) {
    startRegisterTransition(async () => {
      const result = await registerDeviceAction(formData);
      setRegisterError(!result.success);
      setRegisterMessage(result.message);

      if (result.success && result.deviceId) {
        router.push(`/devices/${result.deviceId}`);
      }
    });
  }

  function onAssign(formData: FormData) {
    startAssignTransition(async () => {
      const result = await assignDeviceAction(formData);
      setAssignError(!result.success);
      setAssignMessage(result.message);

      if (result.success && result.deviceId) {
        router.push(`/devices/${result.deviceId}`);
      }
    });
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
      <section className="surface-card p-6">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-foreground">
          Register Existing Board To Customer
        </h2>
        <p className="mb-5 text-xs text-muted-foreground">
          Enter any known device identifier (PayGo ID, Angaza ID, or serial), then map customer details.
        </p>

        <form action={onAssign} className="space-y-4">
          <Input
            name="identifier"
            label="Device Identifier"
            placeholder="e.g. 614521912 or KBX-2406-001"
            required
            disabled={isAssignPending}
          />

          <Input
            name="customerName"
            label="Customer Name"
            placeholder="e.g. Amina Bello"
            required
            disabled={isAssignPending}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              name="customerPhone"
              label="Customer Phone"
              placeholder="e.g. +234..."
              disabled={isAssignPending}
            />
            <Input
              name="customerEmail"
              type="email"
              label="Customer Email"
              placeholder="optional"
              disabled={isAssignPending}
            />
          </div>

          <Input
            name="customerLocation"
            label="Customer Location"
            placeholder="Town / site"
            disabled={isAssignPending}
          />

          <div>
            <label className="font-mono-data mb-2 block text-[11px] uppercase tracking-wide text-muted-foreground">
              Additional Fields (JSON)
            </label>
            <textarea
              name="customerMetadata"
              rows={4}
              disabled={isAssignPending}
              placeholder='{"phone_alt": "...", "sales_agent": "..."}'
              className="w-full rounded-md border border-border bg-input px-3 py-2 text-[13px] text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 disabled:opacity-50"
            />
          </div>

          <Button
            type="submit"
            disabled={isAssignPending}
            isLoading={isAssignPending}
            className="w-full"
          >
            Register Assignment
          </Button>
        </form>

        {assignMessage && (
          <div
            className={`mt-4 p-3 rounded-md text-[13px] ${
              assignError
                ? "border border-status-error/30 bg-status-error/10 text-status-error"
                : "border border-status-active/30 bg-status-active/10 text-status-active"
            }`}
          >
            {assignMessage}
          </div>
        )}
      </section>

      <section className="surface-card p-6">
        <h2 className="mb-1 text-sm font-semibold uppercase tracking-wide text-foreground">
          Add New Inventory Board
        </h2>
        <p className="mb-5 text-xs text-muted-foreground">
          Use this only for boards not yet present in sheet inventory.
        </p>

        <form action={onRegister} className="space-y-4">
          <Input
            name="serialNumber"
            label="Serial Number"
            placeholder="e.g. KBX-2406-001"
            pattern="[A-Za-z0-9-]+"
            required
            disabled={isRegisterPending}
          />

          <div>
            <label className="font-mono-data mb-2 block text-[11px] uppercase tracking-wide text-muted-foreground">
              Board Type
            </label>
            <select
              name="boardType"
              defaultValue="PAYGO"
              disabled={isRegisterPending}
              className="h-10 w-full rounded-md border border-border bg-input px-3 text-[13px] text-foreground transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25 disabled:opacity-50"
            >
              <option value="PAYGO">PAYGO</option>
              <option value="CLOUD_SOLAR">CLOUD_PAYGO</option>
            </select>
          </div>

          <Input
            name="secretKey"
            label="Secret Key (32 or 64 hex chars)"
            placeholder="hexadecimal key"
            pattern="[0-9a-fA-F]{32}([0-9a-fA-F]{32})?"
            minLength={32}
            maxLength={64}
            required
            disabled={isRegisterPending}
            className="font-mono-data"
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              name="startingCode"
              label="Starting Code"
              placeholder="optional"
              pattern="[0-9]{1,9}"
              disabled={isRegisterPending}
            />
            <Input
              name="productType"
              label="Product Type"
              placeholder="optional"
              disabled={isRegisterPending}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              name="paygoId"
              label="PayGo ID"
              placeholder="optional"
              disabled={isRegisterPending}
            />
            <Input
              name="angazaId"
              label="Angaza ID / Unit Number"
              placeholder="optional"
              disabled={isRegisterPending}
            />
          </div>

          <Button
            type="submit"
            disabled={isRegisterPending}
            isLoading={isRegisterPending}
            className="w-full"
          >
            Add Inventory Device
          </Button>
        </form>

        {registerMessage && (
          <div
            className={`mt-4 p-3 rounded-md text-[13px] ${
              registerError
                ? "border border-status-error/30 bg-status-error/10 text-status-error"
                : "border border-status-active/30 bg-status-active/10 text-status-active"
            }`}
          >
            {registerMessage}
          </div>
        )}
      </section>
    </div>
  );
}
