import { Module } from "@nestjs/common";
import { DataModule } from "@corely/data";
import { IdentityModule } from "../identity";
import { ApprovalsPolicyController } from "./adapters/http/approvals-policy.controller";
import { ApprovalsRequestsController } from "./adapters/http/approvals-requests.controller";
import { ApprovalPolicyService } from "./application/approval-policy.service";
import { ApprovalGateService } from "./application/approval-gate.service";
import { ApprovalRequestService } from "./application/approval-request.service";
import { WorkflowModule } from "../workflow";
import { IdempotencyService } from "../../shared/infrastructure/idempotency/idempotency.service";

@Module({
  imports: [DataModule, WorkflowModule, IdentityModule],
  controllers: [ApprovalsPolicyController, ApprovalsRequestsController],
  providers: [
    ApprovalPolicyService,
    ApprovalGateService,
    ApprovalRequestService,
    IdempotencyService,
  ],
  exports: [ApprovalGateService, ApprovalPolicyService],
})
export class ApprovalsModule {}
