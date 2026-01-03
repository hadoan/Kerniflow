import { Inject, Injectable } from "@nestjs/common";
import {
  CreateCustomFieldDefinition,
  ListCustomFieldDefinitions,
  UpdateCustomFieldDefinition,
  UpsertEntityLayout,
} from "@corely/domain";
import type { CustomFieldDefinitionRepository, EntityLayoutRepository } from "@corely/data";
import type { AuditPort } from "../../shared/ports/audit.port";
import { AUDIT_PORT_TOKEN } from "../../shared/ports/audit.port";
import type { IdempotencyStoragePort } from "../../shared/ports/idempotency-storage.port";
import { IDEMPOTENCY_STORAGE_PORT_TOKEN } from "../../shared/ports/idempotency-storage.port";
import type { IdGeneratorPort } from "../../shared/ports/id-generator.port";
import { ID_GENERATOR_TOKEN } from "../../shared/ports/id-generator.port";
import type { ClockPort } from "../../shared/ports/clock.port";
import { CLOCK_PORT_TOKEN } from "../../shared/ports/clock.port";
import type {
  CreateCustomFieldDefinition as CreateDefinitionContract,
  UpdateCustomFieldDefinition as UpdateDefinitionContract,
  CustomEntityType,
} from "@corely/contracts";
import type { CustomFieldDefinition, EntityLayout } from "@corely/domain";

@Injectable()
export class CustomizationService {
  private readonly createDefinition: CreateCustomFieldDefinition;
  private readonly updateDefinition: UpdateCustomFieldDefinition;
  private readonly listDefinitions: ListCustomFieldDefinitions;
  private readonly upsertLayoutUseCase: UpsertEntityLayout;

  constructor(
    private readonly definitionRepo: CustomFieldDefinitionRepository,
    private readonly layoutRepo: EntityLayoutRepository,
    @Inject(ID_GENERATOR_TOKEN) private readonly idGen: IdGeneratorPort,
    @Inject(CLOCK_PORT_TOKEN) private readonly clock: ClockPort,
    @Inject(AUDIT_PORT_TOKEN) private readonly audit: AuditPort,
    @Inject(IDEMPOTENCY_STORAGE_PORT_TOKEN) private readonly idempotency: IdempotencyStoragePort
  ) {
    this.createDefinition = new CreateCustomFieldDefinition(this.definitionRepo);
    this.updateDefinition = new UpdateCustomFieldDefinition(this.definitionRepo);
    this.listDefinitions = new ListCustomFieldDefinitions(this.definitionRepo);
    this.upsertLayoutUseCase = new UpsertEntityLayout(this.layoutRepo);
  }

  async listCustomFields(tenantId: string, entityType: CustomEntityType) {
    return this.listDefinitions.execute(tenantId, entityType);
  }

  async createCustomField(
    tenantId: string,
    actorUserId: string | null,
    input: CreateDefinitionContract,
    idempotencyKey?: string
  ): Promise<CustomFieldDefinition> {
    const actionKey = `customization:create:${input.entityType}`;
    if (idempotencyKey) {
      const cached = await this.idempotency.get(actionKey, tenantId, idempotencyKey);
      if (cached?.body) {
        return cached.body as CustomFieldDefinition;
      }
    }

    const definition = await this.createDefinition.execute({
      ...input,
      tenantId,
      id: this.idGen.newId(),
      createdAt: this.clock.now(),
      updatedAt: this.clock.now(),
    });

    await this.audit.log({
      tenantId,
      userId: actorUserId ?? "system",
      action: "custom_field.created",
      entityType: "CustomFieldDefinition",
      entityId: definition.id,
    });

    if (idempotencyKey) {
      await this.idempotency.store(actionKey, tenantId, idempotencyKey, { body: definition });
    }

    return definition;
  }

  async updateCustomField(
    tenantId: string,
    actorUserId: string | null,
    id: string,
    patch: UpdateDefinitionContract,
    idempotencyKey?: string
  ): Promise<CustomFieldDefinition> {
    const actionKey = `customization:update:${id}`;
    if (idempotencyKey) {
      const cached = await this.idempotency.get(actionKey, tenantId, idempotencyKey);
      if (cached?.body) {
        return cached.body as CustomFieldDefinition;
      }
    }

    const updated = await this.updateDefinition.execute({
      tenantId,
      id,
      patch: {
        ...patch,
      },
    });

    await this.audit.log({
      tenantId,
      userId: actorUserId ?? "system",
      action: "custom_field.updated",
      entityType: "CustomFieldDefinition",
      entityId: id,
    });

    if (idempotencyKey) {
      await this.idempotency.store(actionKey, tenantId, idempotencyKey, { body: updated });
    }

    return updated;
  }

  async deleteCustomField(tenantId: string, actorUserId: string | null, id: string) {
    await this.definitionRepo.softDelete(tenantId, id);
    await this.audit.log({
      tenantId,
      userId: actorUserId ?? "system",
      action: "custom_field.deleted",
      entityType: "CustomFieldDefinition",
      entityId: id,
    });
  }

  async getLayout(tenantId: string, entityType: CustomEntityType): Promise<EntityLayout | null> {
    return this.layoutRepo.get(tenantId, entityType);
  }

  async upsertLayout(
    tenantId: string,
    actorUserId: string | null,
    entityType: CustomEntityType,
    layout: Record<string, unknown>,
    version?: number,
    idempotencyKey?: string
  ): Promise<EntityLayout> {
    const actionKey = `customization:layout:${entityType}`;
    if (idempotencyKey) {
      const cached = await this.idempotency.get(actionKey, tenantId, idempotencyKey);
      if (cached?.body) {
        return cached.body as EntityLayout;
      }
    }

    const existing = await this.layoutRepo.get(tenantId, entityType);
    const nextVersion = version ?? (existing ? existing.version + 1 : 1);
    const nextId = existing?.id ?? this.idGen.newId();

    const saved = await this.upsertLayoutUseCase.execute({
      tenantId,
      entityType,
      layout,
      version: nextVersion,
      id: nextId,
    });

    await this.audit.log({
      tenantId,
      userId: actorUserId ?? "",
      action: "custom_layout.upserted",
      entityType: "EntityLayout",
      entityId: saved.id,
    });

    if (idempotencyKey) {
      await this.idempotency.store(actionKey, tenantId, idempotencyKey, { body: saved });
    }

    return saved;
  }
}
