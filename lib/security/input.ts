export function sanitizeSearchQuery(value: string): string {
  return value.replace(/[^A-Za-z0-9\-\s_]/g, "").trim().slice(0, 100);
}

export function sanitizeSerialNumber(value: string): string {
  return value.replace(/[^A-Za-z0-9\-]/g, "").slice(0, 50);
}