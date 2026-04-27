import { logUpstreamResponse } from "@/lib/network/upstreamLogger";
import { recordApiCall } from "@/lib/network/apiMetrics";
import { logError } from "@/lib/logging/logger";

type Provider = "cloud_solar" | "innovex";

const DEFAULT_RETRY_DELAYS_MS = [1000, 2000, 4000];

export class UpstreamApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseRetryAfterMs(response: Response): number {
  const retryAfter = response.headers.get("Retry-After");

  if (!retryAfter) {
    return 60000;
  }

  const asSeconds = Number(retryAfter);
  if (Number.isFinite(asSeconds) && asSeconds >= 0) {
    return asSeconds * 1000;
  }

  const asDate = Date.parse(retryAfter);
  if (Number.isFinite(asDate)) {
    return Math.max(0, asDate - Date.now());
  }

  return 60000;
}

export async function fetchWithRetry<T>(params: {
  provider: Provider;
  url: string;
  options: RequestInit;
  maxRetries?: number;
  timeoutMs?: number;
}): Promise<T> {
  const {
    provider,
    url,
    options,
    maxRetries = 3,
    timeoutMs = 30000,
  } = params;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    const startedAt = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      const durationMs = Date.now() - startedAt;
      await logUpstreamResponse({
        provider,
        endpoint: url,
        method: options.method ?? "GET",
        status: response.status,
        durationMs,
        attempt: attempt + 1,
      });
      recordApiCall(provider, response.ok);

      if (response.status === 429) {
        if (attempt === maxRetries) {
          throw new UpstreamApiError(429, "Rate limit exceeded");
        }

        await sleep(parseRetryAfterMs(response));
        continue;
      }

      if (response.status >= 500) {
        if (attempt === maxRetries) {
          throw new UpstreamApiError(response.status, response.statusText);
        }

        await sleep(DEFAULT_RETRY_DELAYS_MS[Math.min(attempt, DEFAULT_RETRY_DELAYS_MS.length - 1)]);
        continue;
      }

      if (!response.ok) {
        throw new UpstreamApiError(response.status, response.statusText);
      }

      if (response.status === 204 || response.headers.get("Content-Length") === "0") {
        return {} as T;
      }

      const textBody = await response.text();
      if (!textBody.trim()) {
        return {} as T;
      }

      return JSON.parse(textBody) as T;
    } catch (error) {
      const durationMs = Date.now() - startedAt;
      const message = error instanceof Error ? error.message : "Unknown upstream error";

      await logUpstreamResponse({
        provider,
        endpoint: url,
        method: options.method ?? "GET",
        durationMs,
        attempt: attempt + 1,
        error: message,
      });
      recordApiCall(provider, false);
      logError("upstream.request_failed", error, {
        provider,
        endpoint: url,
        durationMs,
        attempt: attempt + 1,
      });

      if (error instanceof UpstreamApiError && error.status < 500 && error.status !== 429) {
        throw error;
      }

      if (attempt === maxRetries) {
        if (error instanceof UpstreamApiError) {
          throw error;
        }
        throw new Error(message);
      }

      await sleep(DEFAULT_RETRY_DELAYS_MS[Math.min(attempt, DEFAULT_RETRY_DELAYS_MS.length - 1)]);
    } finally {
      clearTimeout(timeout);
    }
  }

  throw new Error("Max retries exceeded");
}
