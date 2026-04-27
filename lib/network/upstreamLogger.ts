import { logUpstreamEvent } from "@/lib/logging/logger";

export type UpstreamLogEntry = {
  provider: "cloud_solar" | "innovex";
  endpoint: string;
  method: string;
  status?: number;
  durationMs: number;
  attempt: number;
  error?: string;
  requestId?: string;
};

export async function logUpstreamResponse(entry: UpstreamLogEntry): Promise<void> {
  logUpstreamEvent("upstream.request", entry);
}
