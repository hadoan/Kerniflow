import {
  BaseUseCase,
  type LoggerPort,
  type Result,
  type UseCaseContext,
  type UseCaseError,
  ValidationError,
  err,
  ok,
} from "@corely/kernel";
import type {
  ListAccountMappingsInput,
  ListAccountMappingsOutput,
  UpsertAccountMappingInput,
  UpsertAccountMappingOutput,
} from "@corely/contracts";
import type { PurchasingAccountMappingRepositoryPort } from "../ports/account-mapping-repository.port";
import type { IdempotencyStoragePort } from "../../../../shared/ports/idempotency-storage.port";
import { getIdempotentResult, storeIdempotentResult } from "./idempotency";
import { toAccountMappingDto } from "../mappers/purchasing-dto.mapper";
import type { IdGeneratorPort, ClockPort } from "@corely/kernel";

const buildMapping = (params: {
  id: string;
  tenantId: string;
  supplierPartyId: string;
  categoryKey: string;
  glAccountId: string;
  now: Date;
}) => ({
  id: params.id,
  tenantId: params.tenantId,
  supplierPartyId: params.supplierPartyId,
  categoryKey: params.categoryKey,
  glAccountId: params.glAccountId,
  createdAt: params.now,
  updatedAt: params.now,
});

type MappingDeps = {
  logger: LoggerPort;
  mappingRepo: PurchasingAccountMappingRepositoryPort;
  idempotency: IdempotencyStoragePort;
  idGenerator: IdGeneratorPort;
  clock: ClockPort;
};

export class ListAccountMappingsUseCase extends BaseUseCase<
  ListAccountMappingsInput,
  ListAccountMappingsOutput
> {
  constructor(private readonly services: MappingDeps) {
    super({ logger: services.logger });
  }

  protected async handle(
    input: ListAccountMappingsInput,
    ctx: UseCaseContext
  ): Promise<Result<ListAccountMappingsOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId missing from context"));
    }

    const mappings = await this.services.mappingRepo.list(ctx.tenantId, input.supplierPartyId);
    return ok({ mappings: mappings.map(toAccountMappingDto) });
  }
}

export class UpsertAccountMappingUseCase extends BaseUseCase<
  UpsertAccountMappingInput,
  UpsertAccountMappingOutput
> {
  constructor(private readonly services: MappingDeps) {
    super({ logger: services.logger });
  }

  protected async handle(
    input: UpsertAccountMappingInput,
    ctx: UseCaseContext
  ): Promise<Result<UpsertAccountMappingOutput, UseCaseError>> {
    if (!ctx.tenantId) {
      return err(new ValidationError("tenantId missing from context"));
    }

    const cached = await getIdempotentResult<UpsertAccountMappingOutput>({
      idempotency: this.services.idempotency,
      actionKey: "purchasing.upsert-mapping",
      tenantId: ctx.tenantId,
      idempotencyKey: input.idempotencyKey,
    });
    if (cached) {
      return ok(cached);
    }

    const mapping = buildMapping({
      id: this.services.idGenerator.newId(),
      tenantId: ctx.tenantId,
      supplierPartyId: input.supplierPartyId,
      categoryKey: input.categoryKey,
      glAccountId: input.glAccountId,
      now: this.services.clock.now(),
    });

    const saved = await this.services.mappingRepo.upsert(mapping);

    const result = { mapping: toAccountMappingDto(saved) };
    await storeIdempotentResult({
      idempotency: this.services.idempotency,
      actionKey: "purchasing.upsert-mapping",
      tenantId: ctx.tenantId,
      idempotencyKey: input.idempotencyKey,
      body: result,
    });

    return ok(result);
  }
}
