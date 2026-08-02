import type { APIRequestContext } from "@playwright/test";
import type { DeterministicScenario } from "../../../../../services/api/src/modules/ai-copilot/infrastructure/model/deterministic-model-registry.ts";

export class DeterministicAiHelper {
  private readonly apiUrl: string;

  constructor(
    private readonly request: APIRequestContext,
    private readonly tenantId: string
  ) {
    this.apiUrl = process.env.API_URL || "http://localhost:3000";
  }

  async activateScenario(scenario: DeterministicScenario) {
    const res = await this.request.post(`${this.apiUrl}/test/copilot/deterministic-scenario`, {
      headers: {
        "X-Test-Secret": process.env.TEST_HARNESS_SECRET || "test-secret-key",
      },
      data: {
        tenantId: this.tenantId,
        scenario,
      },
    });
    if (!res.ok()) {
      throw new Error(`Failed to activate scenario: ${await res.text()}`);
    }
  }

  async deactivateScenario() {
    const res = await this.request.post(`${this.apiUrl}/test/copilot/deterministic-scenario`, {
      headers: {
        "X-Test-Secret": process.env.TEST_HARNESS_SECRET || "test-secret-key",
      },
      data: {
        tenantId: this.tenantId,
        scenario: null,
      },
    });
    if (!res.ok()) {
      throw new Error(`Failed to deactivate scenario: ${await res.text()}`);
    }
  }
}
