import type { BoardType } from "@/lib/types";

export type CanonicalBoardType = "CLOUD_SOLAR" | "PAYGO";

export function normalizeBoardType(value: string | null | undefined): CanonicalBoardType | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim().toUpperCase();

  if (normalized === "CLOUD_SOLAR") {
    return "CLOUD_SOLAR";
  }

  if (normalized === "PAYGO" || normalized === "INNOVEX") {
    return "PAYGO";
  }

  return null;
}

export function normalizeBoardTypeForStorage(value: BoardType | string): CanonicalBoardType {
  return normalizeBoardType(value) ?? "PAYGO";
}

export function isRemoteCapableBoard(value: string | null | undefined): boolean {
  return normalizeBoardType(value) === "CLOUD_SOLAR";
}

export function formatBoardTypeLabel(value: string | null | undefined): string {
  const normalized = normalizeBoardType(value);

  if (normalized === "CLOUD_SOLAR") {
    return "CLOUD_PAYGO";
  }

  if (normalized === "PAYGO") {
    return "PAYGO";
  }

  return "UNKNOWN";
}
