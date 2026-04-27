"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { GlassButton } from "@/components/ui/glass-button";
import { GlassInput } from "@/components/ui/glass-input";
import { GlassSelect } from "@/components/ui/glass-select";

type FilterPanelProps = {
  boardType?: string;
  status?: string;
  createdFrom?: string;
  createdTo?: string;
};

export function FilterPanel({ boardType = "", status = "", createdFrom = "", createdTo = "" }: FilterPanelProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function updateParam(name: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(name, value);
    } else {
      params.delete(name);
    }
    params.set("page", "1");
    router.replace(`${pathname}?${params.toString()}`);
  }

  function resetFilters() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("boardType");
    params.delete("status");
    params.delete("createdFrom");
    params.delete("createdTo");
    params.set("page", "1");
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
      <GlassSelect value={boardType} onChange={(event) => updateParam("boardType", event.target.value)}>
        <option value="">All Boards</option>
        <option value="CLOUD_SOLAR">CLOUD_PAYGO</option>
        <option value="PAYGO">PAYGO</option>
      </GlassSelect>

      <GlassSelect value={status} onChange={(event) => updateParam("status", event.target.value)}>
        <option value="">All Statuses</option>
        <option value="active">Active</option>
        <option value="inactive">Inactive</option>
        <option value="error">Error</option>
      </GlassSelect>

      <GlassInput
        type="date"
        value={createdFrom}
        onChange={(event) => updateParam("createdFrom", event.target.value)}
      />
      <GlassInput
        type="date"
        value={createdTo}
        onChange={(event) => updateParam("createdTo", event.target.value)}
      />

      <GlassButton variant="secondary" onClick={resetFilters}>
        Reset Filters
      </GlassButton>
    </div>
  );
}