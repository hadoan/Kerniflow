import { Injectable } from "@nestjs/common";
import { PrivacyRequestRepoPort } from "../../ports/privacy-request-repo.port";
import { OutboxPort } from "@shared/ports/outbox.port";
import { IdGeneratorPort } from "@shared/ports/id-generator.port";
import { ClockPort } from "@shared/ports/clock.port";
import { PrivacyRequest } from "../../../domain/privacy-request.entity";
import { IdentityPort } from "../../ports/identity-port";

export interface RequestAccountErasureInput {
  tenantId: string;
  subjectUserId: string;
  requestedByUserId: string;
}

@Injectable()
export class RequestAccountErasureUseCase {
  constructor(
    private readonly repo: PrivacyRequestRepoPort,
    private readonly outbox: OutboxPort,
    private readonly idGen: IdGeneratorPort,
    private readonly clock: ClockPort,
    private readonly identity: IdentityPort
  ) {}

  async execute(input: RequestAccountErasureInput): Promise<{ requestId: string }> {
    if (this.identity.ensureReauth) {
      await this.identity.ensureReauth({
        tenantId: input.tenantId,
        userId: input.requestedByUserId,
      });
    }

    const now = this.clock.now();
    const request = PrivacyRequest.create({
      id: this.idGen.newId(),
      tenantId: input.tenantId,
      subjectUserId: input.subjectUserId,
      requestedByUserId: input.requestedByUserId,
      type: "ERASE",
      now,
    });
    await this.repo.create(request);
    await this.outbox.enqueue({
      tenantId: input.tenantId,
      eventType: "privacy.requested",
      payload: { requestId: request.id, tenantId: input.tenantId },
    });
    return { requestId: request.id };
  }
}
