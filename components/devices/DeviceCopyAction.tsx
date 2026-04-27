"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, Copy } from "lucide-react";

import { Button } from "@/components/ui/Button";

type CopyOptionKey = "serialNumber" | "angazaId" | "paygoId";

type CopyOption = {
  key: CopyOptionKey;
  label: string;
  value: string;
};

type DeviceCopyActionProps = {
  serialNumber: string;
  angazaId: string | null;
  paygoId: string | null;
};

function createCopyOptions({
  serialNumber,
  angazaId,
  paygoId,
}: DeviceCopyActionProps): CopyOption[] {
  const options: CopyOption[] = [];
  const serial = serialNumber.trim();
  const angaza = (angazaId ?? "").trim();
  const paygo = (paygoId ?? "").trim();

  if (serial.length > 0) {
    options.push({ key: "serialNumber", label: "Serial", value: serial });
  }

  if (angaza.length > 0) {
    options.push({ key: "angazaId", label: "Angaza", value: angaza });
  }

  if (paygo.length > 0) {
    options.push({ key: "paygoId", label: "PayGo", value: paygo });
  }

  return options;
}

export function DeviceCopyAction(props: DeviceCopyActionProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const menuId = useId();
  const options = createCopyOptions(props);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [copiedKey, setCopiedKey] = useState<CopyOptionKey | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  if (options.length === 0) {
    return null;
  }

  const copiedOption =
    copiedKey ? options.find((option) => option.key === copiedKey) ?? null : null;

  async function handleCopy(option: CopyOption) {
    try {
      await navigator.clipboard.writeText(option.value);
      setCopiedKey(option.key);
      setCopyError(null);
      setIsMenuOpen(false);
    } catch {
      setCopyError("Unable to copy value to clipboard.");
      setCopiedKey(null);
    }
  }

  return (
    <div ref={containerRef} className="relative flex items-center justify-end gap-2">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => setIsMenuOpen((current) => !current)}
        className="min-w-24 justify-between text-primary hover:bg-primary/10"
        aria-haspopup="menu"
        aria-expanded={isMenuOpen}
        aria-controls={menuId}
        aria-label="Open copy menu"
      >
        {copiedOption ? (
          <>
            <Check size={14} strokeWidth={2.5} className="mr-1" />
            {`Copied ${copiedOption.label}`}
          </>
        ) : (
          <>
            <Copy size={14} strokeWidth={2.5} className="mr-1" />
            Copy
          </>
        )}
        <ChevronDown
          size={13}
          strokeWidth={2.5}
          className={`ml-1 transition-transform ${isMenuOpen ? "rotate-180" : "rotate-0"}`}
        />
      </Button>

      {isMenuOpen ? (
        <div
          id={menuId}
          role="menu"
          aria-label="Choose ID type to copy"
          className="absolute right-0 top-9 z-20 w-48 rounded-md border border-border bg-card p-1 shadow-lg"
        >
          <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Copy Device ID
          </p>
          {options.map((option) => (
            <button
              key={option.key}
              type="button"
              role="menuitem"
              onClick={() => {
                void handleCopy(option);
              }}
              className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-xs text-foreground transition-colors hover:bg-muted/70 focus-visible:bg-muted/70 focus-visible:outline-none"
            >
              <span className="font-semibold">{option.label}</span>
              <span className="max-w-28 truncate font-mono-data text-muted-foreground">
                {option.value}
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {copyError ? <span role="alert" className="sr-only">{copyError}</span> : null}
    </div>
  );
}