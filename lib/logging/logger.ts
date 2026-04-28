import { randomUUID } from "node:crypto";

type LogLevel = "info" | "warn" | "error";

type BaseLogPayload = {
  requestId?: string;
  [key: string]: unknown;
};

function writeLine(streamName: "app" | "upstream", payload: Record<string, unknown>) {
  const line = JSON.stringify({ ...payload, stream: streamName });
  const level = payload["level"] as LogLevel | undefined;
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}

export function logEvent(level: LogLevel, event: string, payload: BaseLogPayload = {}) {
  writeLine("app", {
    timestamp: new Date().toISOString(),
    level,
    event,
    requestId: payload.requestId ?? randomUUID(),
    ...payload,
  });
}

export function logUpstreamEvent(event: string, payload: BaseLogPayload = {}) {
  writeLine("upstream", {
    timestamp: new Date().toISOString(),
    level: "info",
    event,
    requestId: payload.requestId ?? randomUUID(),
    ...payload,
  });
}

export async function withQueryLogging<T>(label: string, queryFn: () => Promise<T>): Promise<T> {
  const startedAt = Date.now();

  try {
    const result = await queryFn();
    const durationMs = Date.now() - startedAt;

    if (durationMs > 1000) {
      logEvent("warn", "db.slow_query", {
        label,
        durationMs,
      });
    }

    return result;
  } catch (error) {
    const durationMs = Date.now() - startedAt;
    logEvent("error", "db.query_error", {
      label,
      durationMs,
      message: error instanceof Error ? error.message : "Unknown database error",
      stack: error instanceof Error ? error.stack : undefined,
    });
    // Re-throw a sanitized error — the full details are already in the log above.
    // Never expose raw SQL or params to the client.
    throw new Error("A database error occurred. Please try again.");
  }
}

export function logAuthAttempt(payload: {
  username: string;
  result: "success" | "failure";
  reason?: string;
}) {
  logEvent(payload.result === "success" ? "info" : "warn", "auth.attempt", payload);
}

export function logError(event: string, error: unknown, extra?: Record<string, unknown>) {
  logEvent("error", event, {
    ...extra,
    message: error instanceof Error ? error.message : "Unknown error",
    stack: error instanceof Error ? error.stack : undefined,
  });
}