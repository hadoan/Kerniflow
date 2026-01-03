import { Injectable } from "@nestjs/common";
import {
  IdempotencyDecision,
  CopilotIdempotencyPort,
} from "../../application/ports/copilot-idempotency.port";
import { IdempotencyService } from "../../../../shared/infrastructure/idempotency/idempotency.service";

@Injectable()
export class PrismaCopilotIdempotencyAdapter implements CopilotIdempotencyPort {
  constructor(private readonly service: IdempotencyService) {}

  async startOrReplay(params: {
    actionKey: string;
    tenantId: string;
    userId: string;
    idempotencyKey: string;
    requestHash?: string | undefined;
  }): Promise<IdempotencyDecision> {
    return this.service.startOrReplay({
      actionKey: params.actionKey,
      tenantId: params.tenantId,
      userId: params.userId,
      idempotencyKey: params.idempotencyKey,
      requestHash: params.requestHash,
    });
  }

  async markCompleted(params: {
    actionKey: string;
    tenantId: string;
    idempotencyKey: string;
    responseStatus: number;
    responseBody: unknown;
  }): Promise<void> {
    await this.service.complete({
      actionKey: params.actionKey,
      tenantId: params.tenantId,
      idempotencyKey: params.idempotencyKey,
      responseStatus: params.responseStatus,
      responseBody: params.responseBody,
    });
  }

  async markFailed(params: {
    actionKey: string;
    tenantId: string;
    idempotencyKey: string;
    responseStatus?: number | undefined;
    responseBody?: unknown;
  }): Promise<void> {
    await this.service.fail({
      actionKey: params.actionKey,
      tenantId: params.tenantId,
      idempotencyKey: params.idempotencyKey,
      responseStatus: params.responseStatus,
      responseBody: params.responseBody,
    });
  }
}
