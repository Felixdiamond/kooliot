import { fetchWithRetry, UpstreamApiError } from "@/lib/network/apiRetry";

export interface InnovexClient {
  fetchDevices(): Promise<InnovexDeviceSummary[]>;
  fetchTelemetry(
    serial: string,
    from: string,
    to: string
  ): Promise<InnovexTelemetryResponse>;
}

export interface InnovexDeviceSummary {
  serial: string;
  alias: string | null;
}

export interface InnovexTelemetryResponse {
  data: Array<{
    imei: string;
    supply_voltage: number;
    supply_current: number;
    battery_voltage: number;
    panel_voltage: number;
    panel_current: number;
    temp_battery: number;
    temp_room: number;
    time_stamp: string;
    extras: string;
  }>;
  next_page_url: string | null;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class InnovexAPIClient implements InnovexClient {
  private readonly baseUrl = "https://open-api.remotonline.com/api/v1";
  private readonly apiToken: string;
  private readonly pageDelayMs: number;

  constructor(apiToken: string, pageDelayMs = 1000) {
    this.apiToken = apiToken;
    this.pageDelayMs = pageDelayMs;
  }

  async fetchDevices(): Promise<InnovexDeviceSummary[]> {
    let nextUrl: string | null = `${this.baseUrl}/devices?from=2016-01-01&to=${encodeURIComponent(new Date().toISOString().slice(0, 10))}`;
    const devices: InnovexDeviceSummary[] = [];

    while (nextUrl) {
      try {
        const pageResult: {
          data?: Array<{ serial?: string; alias?: string | null }>;
          next_page_url?: string | null;
        } = await fetchWithRetry({
          provider: "innovex",
          url: nextUrl,
          maxRetries: 3,
          timeoutMs: 30000,
          options: {
            method: "GET",
            headers: {
              Authorization: `Bearer ${this.apiToken}`,
              "Content-Type": "application/json",
            },
          },
        });

        const pageDevices = (pageResult.data ?? [])
          .map((entry) => ({
            serial: String(entry.serial ?? "").trim(),
            alias: entry.alias ?? null,
          }))
          .filter((entry) => entry.serial.length > 0);

        devices.push(...pageDevices);
        nextUrl = pageResult.next_page_url ?? null;

        if (nextUrl) {
          await sleep(this.pageDelayMs);
        }
      } catch (error) {
        if (error instanceof UpstreamApiError && error.status === 401) {
          throw new Error("Innovex authentication error (401)");
        }

        throw error;
      }
    }

    return devices;
  }

  async fetchTelemetry(
    serial: string,
    from: string,
    to: string
  ): Promise<InnovexTelemetryResponse> {
    let nextUrl: string | null = `${this.baseUrl}/devices/${serial}/records?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;
    const allData: InnovexTelemetryResponse["data"] = [];

    while (nextUrl) {
      try {
        const pageResult: InnovexTelemetryResponse = await fetchWithRetry<InnovexTelemetryResponse>({
          provider: "innovex",
          url: nextUrl,
          maxRetries: 3,
          timeoutMs: 30000,
          options: {
            method: "GET",
            headers: {
              Authorization: `Bearer ${this.apiToken}`,
              "Content-Type": "application/json",
            },
          },
        });

        allData.push(...pageResult.data);
        nextUrl = pageResult.next_page_url;

        if (nextUrl) {
          await sleep(this.pageDelayMs);
        }
      } catch (error) {
        if (error instanceof UpstreamApiError && error.status === 401) {
          throw new Error("Innovex authentication error (401)");
        }

        if (error instanceof UpstreamApiError && error.status === 404) {
          throw new Error("Innovex device not found (404)");
        }

        throw error;
      }
    }

    return {
      data: allData,
      next_page_url: null,
    };
  }
}
