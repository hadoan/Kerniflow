import { Injectable } from "@nestjs/common";
import {
  IdempotencyDecision,
  CopilotIdempotencyPort,
} from "../../application/ports/copilot-idempotency.port";

type Stored = {
  status: "IN_PROGRESS" | "COMPLETED" | "FAILED";
  body?: unknown;
  statusCode?: number;
  requestHash?: string;
};

@Injectable()
export class InMemoryIdempotencyAdapter implements CopilotIdempotencyPort {
  private readonly cache = new Map<string, Stored>();

  async startOrReplay(params: {
    actionKey: string;
    tenantId: string;
    userId: string;
    idempotencyKey: string;
    requestHash?: string | undefined;
  }): Promise<IdempotencyDecision> {
    const key = this.buildKey(params);
    const existing = this.cache.get(key);
    if (!existing) {
      this.cache.set(key, { status: "IN_PROGRESS", requestHash: params.requestHash });
      return { mode: "STARTED" };
    }

    if (existing.requestHash && params.requestHash && existing.requestHash !== params.requestHash) {
      return { mode: "MISMATCH" };
    }

    if (existing.status === "COMPLETED") {
      return {
        mode: "REPLAY",
        responseStatus: existing.statusCode ?? 200,
        responseBody: existing.body,
      };
    }

    if (existing.status === "FAILED") {
      return {
        mode: "FAILED",
        responseStatus: existing.statusCode ?? 500,
        responseBody: existing.body,
      };
    }

    return { mode: "IN_PROGRESS", retryAfterMs: 500 };
  }

  async markCompleted(params: {
    actionKey: string;
    tenantId: string;
    idempotencyKey: string;
    responseStatus: number;
    responseBody: unknown;
  }): Promise<void> {
    const key = this.buildKey(params);
    this.cache.set(key, {
      status: "COMPLETED",
      statusCode: params.responseStatus,
      body: params.responseBody,
    });
  }

  async markFailed(params: {
    actionKey: string;
    tenantId: string;
    idempotencyKey: string;
    responseStatus?: number;
    responseBody?: unknown;
  }): Promise<void> {
    const key = this.buildKey(params);
    this.cache.set(key, {
      status: "FAILED",
      statusCode: params.responseStatus ?? 500,
      body: params.responseBody,
    });
  }

  private buildKey(params: { actionKey: string; tenantId: string; idempotencyKey: string }) {
    return `${params.tenantId}:${params.actionKey}:${params.idempotencyKey}`;
  }
}
