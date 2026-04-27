"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Search, X } from "lucide-react";

import { formatBoardTypeLabel } from "@/lib/domain/boards";
import { Button } from "@/components/ui/Button";

export type DevicePickerItem = {
  id: number;
  serialNumber: string;
  boardType: string | null;
  angazaId: string | null;
  paygoId: string | null;
  productType: string | null;
};

type DevicePickerModalProps = {
  open: boolean;
  title: string;
  devices: DevicePickerItem[];
  selectedDeviceId: number | null;
  onClose: () => void;
  onSelect: (deviceId: number) => void;
  emptyMessage: string;
  searchPlaceholder?: string;
};

export function DevicePickerModal({
  open,
  title,
  devices,
  selectedDeviceId,
  onClose,
  onSelect,
  emptyMessage,
  searchPlaceholder = "Search by ID, serial, Angaza, PayGo, or product",
}: DevicePickerModalProps) {
  const [search, setSearch] = useState("");

  useEffect(() => {
    if (!open) {
      return;
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setSearch("");
        onClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  const filteredDevices = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return devices;
    }

    return devices.filter((device) => {
      const searchable = [
        String(device.id),
        device.serialNumber,
        device.angazaId ?? "",
        device.paygoId ?? "",
        device.productType ?? "",
      ]
        .join(" ")
        .toLowerCase();

      return searchable.includes(query);
    });
  }, [devices, search]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true">
      <div className="surface-card w-full max-w-2xl p-4 md:p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h3 className="font-heading text-lg font-semibold text-foreground">{title}</h3>
          <button
            type="button"
            onClick={() => {
              setSearch("");
              onClose();
            }}
            className="rounded-md border border-border p-2 text-muted-foreground transition-colors hover:text-foreground"
            aria-label="Close picker"
          >
            <X size={16} />
          </button>
        </div>

        <div className="relative mb-4">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={searchPlaceholder}
            className="h-10 w-full rounded-md border border-border bg-input pl-9 pr-3 text-sm text-foreground shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/25"
          />
        </div>

        <div className="max-h-80 space-y-2 overflow-y-auto pr-1">
          {filteredDevices.length === 0 ? (
            <p className="rounded-md border border-border/70 bg-muted/20 p-4 text-sm text-muted-foreground">
              {emptyMessage}
            </p>
          ) : (
            filteredDevices.map((device) => {
              const isSelected = selectedDeviceId === device.id;

              return (
                <button
                  key={device.id}
                  type="button"
                  onClick={() => {
                    onSelect(device.id);
                    setSearch("");
                    onClose();
                  }}
                  className={`w-full rounded-md border p-3 text-left transition-colors ${
                    isSelected
                      ? "border-primary/50 bg-primary/10"
                      : "border-border/70 bg-muted/20 hover:border-primary/30"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono-data text-sm font-semibold text-foreground">#{device.id} - {device.serialNumber}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatBoardTypeLabel(device.boardType)}
                        {device.angazaId ? ` | Angaza: ${device.angazaId}` : ""}
                        {device.paygoId ? ` | PayGo: ${device.paygoId}` : ""}
                      </p>
                    </div>
                    {isSelected ? <Check size={16} className="text-primary" /> : null}
                  </div>
                </button>
              );
            })
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              setSearch("");
              onClose();
            }}
          >
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
