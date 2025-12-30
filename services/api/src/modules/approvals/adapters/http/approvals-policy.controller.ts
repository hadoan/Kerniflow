import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApprovalPolicyInputSchema } from "@corely/contracts";
import {
  CurrentTenantId,
  CurrentUserId,
} from "../../../identity/adapters/http/current-user.decorator";
import { ApprovalPolicyService } from "../../application/approval-policy.service";

@Controller("approvals/policies")
export class ApprovalsPolicyController {
  constructor(private readonly policies: ApprovalPolicyService) {}

  @Post()
  async createPolicy(
    @CurrentTenantId() tenantId: string,
    @CurrentUserId() userId: string | undefined,
    @Body() body: unknown
  ) {
    const input = ApprovalPolicyInputSchema.parse(body);
    // TODO: enforce RBAC for approval policy management
    return this.policies.createPolicy(tenantId, input, userId);
  }

  @Get()
  async listPolicies(
    @CurrentTenantId() tenantId: string,
    @Query("status") status?: string,
    @Query("key") key?: string
  ) {
    return this.policies.listPolicies(tenantId, status, key);
  }

  @Get(":id")
  async getPolicy(@CurrentTenantId() tenantId: string, @Param("id") id: string) {
    return this.policies.getPolicy(tenantId, id);
  }

  @Post(":id/activate")
  async activate(@CurrentTenantId() tenantId: string, @Param("id") id: string) {
    return this.policies.setPolicyStatus(tenantId, id, "ACTIVE");
  }

  @Post(":id/deactivate")
  async deactivate(@CurrentTenantId() tenantId: string, @Param("id") id: string) {
    return this.policies.setPolicyStatus(tenantId, id, "INACTIVE");
  }
}
