import { fetchWithRetry, UpstreamApiError } from "@/lib/network/apiRetry";

export interface CloudSolarClient {
  fetchTelemetry(
    deviceId: string,
    startUnix: number,
    endUnix: number
  ): Promise<CloudSolarTelemetryResponse>;
  setDeviceState(deviceId: string, enabled: boolean): Promise<void>;
}

export interface CloudSolarTelemetryResponse {
  results: Array<{
    timestamp: number;
    load_state: string;
    load_w: number;
    output_wh_total: number;
    output_wh_delta: number;
    solar_w: number;
    solar_v: number;
    input_wh_total: number;
    bat_v: number;
    state_of_charge: number;
    full_charges_count: number;
    deep_discharges_count: number;
    bat_chg_total_wh: number;
    bat_dis_total_wh: number;
    bat_usable_ah: number;
    bat_temp: number;
    restart_detected: boolean;
    signal_strength: number;
    error_flag: boolean;
    peripheral_temperature: number;
    peripheral_humidity: number;
    peripheral_door_counter: number;
    peripheral_door_time: number;
  }>;
}

type AuthScheme = "Token" | "Bearer";

export class CloudSolarAPIClient implements CloudSolarClient {
  private readonly baseUrl = "https://cloud-solar.com/api/v1";
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  private async requestJson<T>(
    url: string,
    method: "GET" | "PUT",
    authScheme: AuthScheme,
    body?: unknown
  ): Promise<T> {
    return fetchWithRetry<T>({
      provider: "cloud_solar",
      url,
      maxRetries: 3,
      timeoutMs: 30000,
      options: {
        method,
        headers: {
          Authorization: `${authScheme} ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: body ? JSON.stringify(body) : undefined,
      },
    });
  }

  async fetchTelemetry(
    deviceId: string,
    startUnix: number,
    endUnix: number
  ): Promise<CloudSolarTelemetryResponse> {
    const url = `${this.baseUrl}/devices/${deviceId}/reports?start=${startUnix}&end=${endUnix}`;

    let rawData: unknown;

    try {
      rawData = await this.requestJson<unknown>(url, "GET", "Token");
    } catch (error) {
      if (error instanceof UpstreamApiError && error.status === 401) {
        rawData = await this.requestJson<unknown>(url, "GET", "Bearer");
      } else {
        if (error instanceof UpstreamApiError && error.status === 403) {
          throw new Error("Cloud Solar authorization error (403)");
        }

        if (error instanceof UpstreamApiError && error.status === 404) {
          throw new Error("Cloud Solar device not found (404)");
        }

        throw error;
      }
    }

    if (Array.isArray(rawData)) {
      return { results: rawData as CloudSolarTelemetryResponse["results"] };
    }

    if (rawData && typeof rawData === "object") {
      const obj = rawData as Record<string, unknown>;
      if (Array.isArray(obj.results)) {
        return { results: obj.results as CloudSolarTelemetryResponse["results"] };
      }
      return { results: [obj] as CloudSolarTelemetryResponse["results"] };
    }

    return { results: [] };
  }

  async setDeviceState(deviceId: string, enabled: boolean): Promise<void> {
    const url = `${this.baseUrl}/devices/${deviceId}/state`;

    try {
      await this.requestJson<Record<string, never>>(url, "PUT", "Token", { enabled });
      return;
    } catch (error) {
      if (error instanceof UpstreamApiError && error.status === 401) {
        await this.requestJson<Record<string, never>>(url, "PUT", "Bearer", {
          enabled,
        });
        return;
      }

      throw error;
    }
  }
}
