import type { HttpPort } from "@corely/core";

export class SystemHttpAdapter implements HttpPort {
  async request(input: {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: unknown;
    timeoutMs?: number;
  }): Promise<{ status: number; body?: unknown; headers?: Record<string, string> }> {
    const controller = new AbortController();
    const timeout = input.timeoutMs ? setTimeout(() => controller.abort(), input.timeoutMs) : null;

    try {
      const response = await fetch(input.url, {
        method: input.method,
        headers: input.headers,
        body: input.body ? JSON.stringify(input.body) : undefined,
        signal: controller.signal,
      });

      const contentType = response.headers.get("content-type") ?? "";
      let body: unknown = undefined;
      if (contentType.includes("application/json")) {
        body = await response.json().catch(() => undefined);
      } else {
        body = await response.text().catch(() => undefined);
      }

      return {
        status: response.status,
        body,
        headers: Object.fromEntries(response.headers.entries()),
      };
    } finally {
      if (timeout) {
        clearTimeout(timeout);
      }
    }
  }
}
