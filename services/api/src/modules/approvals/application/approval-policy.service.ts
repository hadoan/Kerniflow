import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import {
  type ApprovalPolicyInput,
  ApprovalPolicyInputSchema,
  WorkflowDefinitionStatusSchema,
} from "@corely/contracts";
import { WorkflowDefinitionRepository } from "@corely/data";
import { buildApprovalWorkflowSpec } from "./approval-spec.builder";

const APPROVAL_KEY_PREFIX = "approval.";

@Injectable()
export class ApprovalPolicyService {
  private readonly logger = new Logger(ApprovalPolicyService.name);

  constructor(private readonly definitions: WorkflowDefinitionRepository) {}

  async createPolicy(tenantId: string, input: ApprovalPolicyInput, createdBy?: string) {
    const policy = ApprovalPolicyInputSchema.parse(input);
    const key = policy.key.startsWith(APPROVAL_KEY_PREFIX)
      ? policy.key
      : `${APPROVAL_KEY_PREFIX}${policy.key}`;

    const latest = await this.definitions.findLatestByKey(tenantId, key);
    const nextVersion = latest ? latest.version + 1 : 1;
    const spec = buildApprovalWorkflowSpec({ ...policy, key });

    const definition = await this.definitions.create({
      tenantId,
      key,
      version: nextVersion,
      name: policy.name,
      description: policy.description ?? null,
      type: "APPROVAL",
      status: policy.status ?? "ACTIVE",
      spec: JSON.stringify(spec),
      createdBy: createdBy ?? null,
    });

    this.logger.log(
      JSON.stringify({
        message: "approval.policy.created",
        tenantId,
        policyKey: key,
        definitionId: definition.id,
      })
    );

    return definition;
  }

  async listPolicies(tenantId: string, status?: string, key?: string) {
    const prefix = key
      ? key.startsWith(APPROVAL_KEY_PREFIX)
        ? key
        : `${APPROVAL_KEY_PREFIX}${key}`
      : APPROVAL_KEY_PREFIX;
    const normalizedStatus = status ? WorkflowDefinitionStatusSchema.parse(status) : undefined;
    return this.definitions.listByKeyPrefix(tenantId, prefix, normalizedStatus, "APPROVAL");
  }

  async getPolicy(tenantId: string, id: string) {
    const definition = await this.definitions.findById(tenantId, id);
    if (!definition) {
      throw new NotFoundException("Approval policy not found");
    }
    return definition;
  }

  async setPolicyStatus(tenantId: string, id: string, status: "ACTIVE" | "INACTIVE" | "ARCHIVED") {
    const result = await this.definitions.updateStatus(tenantId, id, status);
    if (result.count === 0) {
      throw new NotFoundException("Approval policy not found");
    }
    return result;
  }

  async findActivePolicyByKey(tenantId: string, key: string) {
    const lookupKey = key.startsWith(APPROVAL_KEY_PREFIX) ? key : `${APPROVAL_KEY_PREFIX}${key}`;
    return this.definitions.findActiveByKey(tenantId, lookupKey);
  }
}
