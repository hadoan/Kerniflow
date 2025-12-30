import { BadRequestException, Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApprovalDecisionInputSchema } from "@corely/contracts";
import {
  CurrentTenantId,
  CurrentUserId,
} from "../../../identity/adapters/http/current-user.decorator";
import { ApprovalRequestService } from "../../application/approval-request.service";

@Controller("approvals")
export class ApprovalsRequestsController {
  constructor(private readonly requests: ApprovalRequestService) {}

  @Get("requests")
  async listRequests(
    @CurrentTenantId() tenantId: string,
    @Query("status") status?: string,
    @Query("businessKey") businessKey?: string
  ) {
    return this.requests.listRequests(tenantId, { status, businessKey });
  }

  @Get("requests/:id")
  async getRequest(@CurrentTenantId() tenantId: string, @Param("id") id: string) {
    return this.requests.getRequest(tenantId, id);
  }

  @Get("inbox")
  async inbox(@CurrentTenantId() tenantId: string, @CurrentUserId() userId: string) {
    if (!userId) {
      throw new BadRequestException("Missing user context");
    }
    return this.requests.listInbox(tenantId, userId);
  }

  @Post("tasks/:taskId/decision")
  async decide(
    @CurrentTenantId() tenantId: string,
    @CurrentUserId() userId: string,
    @Param("taskId") taskId: string,
    @Body() body: unknown
  ) {
    if (!userId) {
      throw new BadRequestException("Missing user context");
    }
    const input = ApprovalDecisionInputSchema.parse(body);
    return this.requests.decideTask(tenantId, userId, taskId, input);
  }
}
