"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { GlassCard } from "@/components/ui/glass-card";
import { GlassInput } from "@/components/ui/glass-input";

type SearchResult = {
  id: number;
  serialNumber: string;
  boardType: string;
  status: string;
};

type SearchBarProps = {
  initialQuery?: string;
};

export function SearchBar({ initialQuery = "" }: SearchBarProps) {
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  const trimmed = useMemo(() => query.trim(), [query]);

  useEffect(() => {
    if (!trimmed) {
      setResults([]);
      return;
    }

    const controller = new AbortController();
    const handle = setTimeout(async () => {
      setLoading(true);
      try {
        const response = await fetch(`/api/devices/search?q=${encodeURIComponent(trimmed)}`, {
          method: "GET",
          signal: controller.signal,
          cache: "no-store",
        });

        if (!response.ok) {
          setResults([]);
          return;
        }

        const payload = (await response.json()) as { results: SearchResult[] };
        setResults(payload.results ?? []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      controller.abort();
      clearTimeout(handle);
    };
  }, [trimmed]);

  return (
    <div className="relative w-full max-w-md">
      <GlassInput
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search by serial number"
      />

      {(loading || results.length > 0 || trimmed.length > 0) && (
        <GlassCard className="absolute z-20 mt-2 w-full p-2">
          {loading ? (
            <p className="px-2 py-1 text-sm text-slate-700 dark:text-slate-300">Searching...</p>
          ) : results.length === 0 ? (
            <p className="px-2 py-1 text-sm text-slate-700 dark:text-slate-300">No matching devices</p>
          ) : (
            <ul className="space-y-1">
              {results.map((item) => (
                <li key={item.id}>
                  <Link
                    href={`/devices/${item.id}`}
                    className="flex items-center justify-between rounded-lg px-2 py-1.5 text-sm text-slate-900 transition hover:bg-white/20 dark:text-slate-100"
                  >
                    <span className="font-medium">{item.serialNumber}</span>
                    <span className="text-xs capitalize text-slate-700 dark:text-slate-300">
                      {item.boardType} · {item.status}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </GlassCard>
      )}
    </div>
  );
}