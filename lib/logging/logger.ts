import { mkdirSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

import { createStream } from "rotating-file-stream";

type LogLevel = "info" | "warn" | "error";

type BaseLogPayload = {
  requestId?: string;
  [key: string]: unknown;
};

const logDirectory = path.join(process.cwd(), "logs");
mkdirSync(logDirectory, { recursive: true });

const appLogStream = createStream("app.log", {
  path: logDirectory,
  size: "100M",
  interval: "1d",
  maxFiles: 30,
  compress: "gzip",
});

const upstreamLogStream = createStream("upstream_responses.log", {
  path: logDirectory,
  size: "100M",
  interval: "1d",
  maxFiles: 30,
  compress: "gzip",
});

function writeLine(streamName: "app" | "upstream", payload: Record<string, unknown>) {
  const stream = streamName === "app" ? appLogStream : upstreamLogStream;
  stream.write(`${JSON.stringify(payload)}\n`);
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
    throw error;
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