import { logEvent } from "@/lib/logging/logger";

type Provider = "cloud_solar" | "innovex";

const WINDOW_MS = 60 * 60 * 1000;
const ALERT_THRESHOLD = 0.9;

type ApiMetricPoint = {
  ts: number;
  success: boolean;
};

const metricsStore: Record<Provider, ApiMetricPoint[]> = {
  cloud_solar: [],
  innovex: [],
};

const lastAlertAt: Partial<Record<Provider, number>> = {};

function prune(provider: Provider) {
  const cutoff = Date.now() - WINDOW_MS;
  metricsStore[provider] = metricsStore[provider].filter((point) => point.ts >= cutoff);
}

function calculateSuccessRate(provider: Provider): number {
  const points = metricsStore[provider];
  if (points.length === 0) {
    return 1;
  }

  const successful = points.filter((point) => point.success).length;
  return successful / points.length;
}

function sendApiAlertNotification(provider: Provider, successRate: number, sampleSize: number) {
  logEvent("error", "upstream.success_rate_alert", {
    provider,
    successRate,
    sampleSize,
    message: `API success rate below 90% for ${provider} in the last hour`,
  });
}

export function recordApiCall(provider: Provider, success: boolean) {
  metricsStore[provider].push({ ts: Date.now(), success });
  prune(provider);

  const successRate = calculateSuccessRate(provider);
  const sampleSize = metricsStore[provider].length;

  if (sampleSize < 10) {
    return;
  }

  if (successRate < ALERT_THRESHOLD) {
    const previousAlertAt = lastAlertAt[provider] ?? 0;
    if (Date.now() - previousAlertAt >= 5 * 60 * 1000) {
      sendApiAlertNotification(provider, successRate, sampleSize);
      lastAlertAt[provider] = Date.now();
    }
  }
}

export function getApiSuccessRate(provider: Provider) {
  prune(provider);
  return {
    provider,
    successRate: calculateSuccessRate(provider),
    sampleSize: metricsStore[provider].length,
  };
}