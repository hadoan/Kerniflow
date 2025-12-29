export interface HttpPort {
  request(input: {
    method: string;
    url: string;
    headers?: Record<string, string>;
    body?: unknown;
    timeoutMs?: number;
  }): Promise<{ status: number; body?: unknown; headers?: Record<string, string> }>;
}
