/**
 * Simple HTTP client for calling test harness endpoints
 */
class ApiClient {
  private baseUrl: string;
  private testSecret: string;

  constructor(baseUrl?: string, testSecret?: string) {
    this.baseUrl = baseUrl || process.env.API_URL || "http://localhost:3000";
    this.testSecret = testSecret || process.env.TEST_HARNESS_SECRET || "test-secret-key";
  }

  private getHeaders(): HeadersInit {
    return {
      "Content-Type": "application/json",
      "X-Test-Secret": this.testSecret,
    };
  }

  async get<T = unknown>(path: string): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "GET",
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`API GET ${path} failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async post<T = unknown>(path: string, data?: unknown): Promise<T> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "POST",
      headers: this.getHeaders(),
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      throw new Error(`API POST ${path} failed: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async delete(path: string): Promise<void> {
    const response = await fetch(`${this.baseUrl}${path}`, {
      method: "DELETE",
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      throw new Error(`API DELETE ${path} failed: ${response.status} ${response.statusText}`);
    }
  }
}

export const apiClient = new ApiClient();
