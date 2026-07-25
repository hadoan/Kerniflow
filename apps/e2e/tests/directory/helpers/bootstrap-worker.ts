import { loadDirectoryE2eEnv } from "./env.ts";
import { API_BASE_URL } from "./http.ts";

loadDirectoryE2eEnv();

export async function runOutboxWorkerTick(): Promise<void> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const serviceToken = process.env.WORKER_API_SERVICE_TOKEN?.trim();
  if (serviceToken) {
    headers["x-service-token"] = serviceToken;
  } else if (process.env.INTERNAL_WORKER_KEY?.trim()) {
    headers["x-worker-key"] = process.env.INTERNAL_WORKER_KEY.trim();
  }

  const response = await fetch(`${API_BASE_URL}/internal/background/outbox/run`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      limit: 50,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(
      `Failed to trigger API background outbox run: ${response.status} ${response.statusText} ${body}`
    );
  }
}
