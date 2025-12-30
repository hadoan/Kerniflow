import { BadRequestException, Injectable, Inject } from "@nestjs/common";
import { type ApprovalPolicyInput, type ApprovalRules } from "@corely/contracts";
import { AUDIT_PORT, OUTBOX_PORT } from "@corely/kernel";
import type { AuditPort, OutboxPort } from "@corely/kernel";
import { WorkflowService } from "../../workflow/application/workflow.service";
import { DomainEventRepository } from "@corely/data";
import { IdempotencyService } from "../../../shared/infrastructure/idempotency/idempotency.service";
import { ApprovalPolicyService } from "./approval-policy.service";
import { ApprovalWorkflowEvents } from "./approval-spec.builder";

interface ApprovalGateRequest {
  tenantId: string;
  userId: string;
  actionKey: string;
  entityType: string;
  entityId: string;
  payload: Record<string, unknown>;
  idempotencyKey: string;
}

@Injectable()
export class ApprovalGateService {
  constructor(
    private readonly policies: ApprovalPolicyService,
    private readonly workflows: WorkflowService,
    @Inject(AUDIT_PORT)
    private readonly audit: AuditPort,
    @Inject(OUTBOX_PORT)
    private readonly outbox: OutboxPort,
    private readonly domainEvents: DomainEventRepository,
    private readonly idempotency: IdempotencyService
  ) {}

  async requireApproval(input: ApprovalGateRequest) {
    const start = await this.idempotency.startOrReplay({
      actionKey: `approvalGate:${input.actionKey}`,
      tenantId: input.tenantId,
      userId: input.userId,
      idempotencyKey: input.idempotencyKey,
      requestHash: JSON.stringify({
        actionKey: input.actionKey,
        entityId: input.entityId,
        payload: input.payload,
      }),
    });

    if (start.mode === "REPLAY") {
      return start.responseBody as any;
    }

    if (start.mode === "FAILED") {
      return start.responseBody as any;
    }

    if (start.mode === "IN_PROGRESS") {
      return { status: "PENDING", retryAfterMs: start.retryAfterMs ?? 1000 };
    }

    if (start.mode === "MISMATCH") {
      throw new BadRequestException("Idempotency key reuse with different payload");
    }

    const policy = await this.policies.findActivePolicyByKey(input.tenantId, input.actionKey);
    if (!policy) {
      await this.audit.log({
        tenantId: input.tenantId,
        userId: input.userId,
        action: "approval.gate.skipped",
        entityType: input.entityType,
        entityId: input.entityId,
        metadata: { actionKey: input.actionKey, reason: "no_policy" },
      });

      await this.idempotency.complete({
        actionKey: `approvalGate:${input.actionKey}`,
        tenantId: input.tenantId,
        idempotencyKey: input.idempotencyKey,
        responseStatus: 200,
        responseBody: { status: "APPROVED", reason: "no_policy" },
      });

      return { status: "APPROVED", reason: "no_policy" };
    }

    const spec = JSON.parse(policy.spec) as { meta?: { policy?: ApprovalPolicyInput } };
    const rules = (spec.meta?.policy?.rules ?? null) as ApprovalRules | null;

    if (rules && !evaluateRules(rules, input.payload)) {
      await this.audit.log({
        tenantId: input.tenantId,
        userId: input.userId,
        action: "approval.gate.skipped",
        entityType: input.entityType,
        entityId: input.entityId,
        metadata: { actionKey: input.actionKey, reason: "rules_not_matched" },
      });

      await this.idempotency.complete({
        actionKey: `approvalGate:${input.actionKey}`,
        tenantId: input.tenantId,
        idempotencyKey: input.idempotencyKey,
        responseStatus: 200,
        responseBody: { status: "APPROVED", reason: "rules_not_matched" },
      });

      return { status: "APPROVED", reason: "rules_not_matched" };
    }

    const instance = await this.workflows.startInstance(input.tenantId, {
      definitionId: policy.id,
      businessKey: `${input.actionKey}:${input.entityId}`,
      context: {
        actionKey: input.actionKey,
        entityType: input.entityType,
        entityId: input.entityId,
        payload: input.payload,
        requestedBy: input.userId,
      },
      startEvent: {
        type: ApprovalWorkflowEvents.REQUESTED,
        payload: {
          actionKey: input.actionKey,
          entityId: input.entityId,
          payload: input.payload,
        },
      },
    });

    await this.audit.log({
      tenantId: input.tenantId,
      userId: input.userId,
      action: "approval.requested",
      entityType: input.entityType,
      entityId: input.entityId,
      metadata: { actionKey: input.actionKey, instanceId: instance.id },
    });

    await this.domainEvents.append({
      tenantId: input.tenantId,
      eventType: "approval.requested",
      payload: JSON.stringify({
        actionKey: input.actionKey,
        instanceId: instance.id,
        entityId: input.entityId,
      }),
    });

    await this.outbox.enqueue({
      tenantId: input.tenantId,
      eventType: "approval.requested",
      payload: {
        actionKey: input.actionKey,
        instanceId: instance.id,
        entityId: input.entityId,
      },
      correlationId: instance.id,
    });

    await this.idempotency.complete({
      actionKey: `approvalGate:${input.actionKey}`,
      tenantId: input.tenantId,
      idempotencyKey: input.idempotencyKey,
      responseStatus: 202,
      responseBody: { status: "PENDING", instanceId: instance.id },
    });

    return { status: "PENDING", instanceId: instance.id, policyId: policy.id };
  }
}

function evaluateRules(rules: ApprovalRules, payload: Record<string, unknown>): boolean {
  const allRules = rules.all ?? [];
  const anyRules = rules.any ?? [];

  const allMatch = allRules.length === 0 || allRules.every((rule) => matchRule(rule, payload));
  const anyMatch = anyRules.length === 0 || anyRules.some((rule) => matchRule(rule, payload));

  return allMatch && anyMatch;
}

function matchRule(rule: ApprovalRules["all"][number], payload: Record<string, unknown>): boolean {
  const value = getValueByPath(payload, rule.field);

  switch (rule.operator) {
    case "exists":
      return value !== undefined && value !== null;
    case "eq":
      return value === rule.value;
    case "neq":
      return value !== rule.value;
    case "gt":
      return typeof value === "number" && typeof rule.value === "number" && value > rule.value;
    case "gte":
      return typeof value === "number" && typeof rule.value === "number" && value >= rule.value;
    case "lt":
      return typeof value === "number" && typeof rule.value === "number" && value < rule.value;
    case "lte":
      return typeof value === "number" && typeof rule.value === "number" && value <= rule.value;
    case "in":
      return Array.isArray(rule.value) && rule.value.includes(value as any);
    case "contains":
      if (Array.isArray(value)) {
        return value.includes(rule.value as any);
      }
      if (typeof value === "string" && typeof rule.value === "string") {
        return value.includes(rule.value);
      }
      return false;
    default:
      return false;
  }
}

function getValueByPath(payload: Record<string, unknown>, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in acc) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, payload);
}
