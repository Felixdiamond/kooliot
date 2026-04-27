"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { GlassButton } from "@/components/ui/glass-button";
import { GlassSelect } from "@/components/ui/glass-select";

type PaginationControlsProps = {
  page: number;
  pageSize: number;
  total: number;
};

export function PaginationControls({ page, pageSize, total }: PaginationControlsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function setPage(nextPage: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("page", String(Math.min(totalPages, Math.max(1, nextPage))));
    router.replace(`${pathname}?${params.toString()}`);
  }

  function setPageSize(nextPageSize: number) {
    const params = new URLSearchParams(searchParams.toString());
    params.set("pageSize", String(nextPageSize));
    params.set("page", "1");
    router.replace(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-col items-start justify-between gap-3 md:flex-row md:items-center">
      <p className="text-sm text-cyan-100/90">
        Page {page} of {totalPages} · {total} records
      </p>

      <div className="flex items-center gap-2">
        <GlassButton variant="secondary" onClick={() => setPage(page - 1)} disabled={page <= 1}>
          Prev
        </GlassButton>
        <GlassButton
          variant="secondary"
          onClick={() => setPage(page + 1)}
          disabled={page >= totalPages}
        >
          Next
        </GlassButton>
        <GlassSelect
          value={String(pageSize)}
          onChange={(event) => setPageSize(Number(event.target.value))}
          className="w-32"
        >
          <option value="10">10 / page</option>
          <option value="20">20 / page</option>
          <option value="50">50 / page</option>
        </GlassSelect>
      </div>
    </div>
  );
}