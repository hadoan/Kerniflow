import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import {
  ListWorkflowInstancesQuerySchema,
  SendWorkflowEventInputSchema,
  StartWorkflowInstanceInputSchema,
} from "@corely/contracts";
import { WorkflowService } from "../../application/workflow.service";
import { CurrentTenantId } from "../../../identity/adapters/http/current-user.decorator";

@Controller("workflow/instances")
export class WorkflowInstancesController {
  constructor(private readonly workflow: WorkflowService) {}

  @Post()
  async startInstance(@CurrentTenantId() tenantId: string, @Body() body: unknown) {
    const input = StartWorkflowInstanceInputSchema.parse(body);

    // TODO: add RBAC checks for workflow instance start
    return this.workflow.startInstance(tenantId, input);
  }

  @Get()
  async listInstances(@CurrentTenantId() tenantId: string, @Query() query: unknown) {
    const filters = ListWorkflowInstancesQuerySchema.parse(query);
    return this.workflow.listInstances(tenantId, filters);
  }

  @Get(":id")
  async getInstance(@CurrentTenantId() tenantId: string, @Param("id") id: string) {
    return this.workflow.getInstance(tenantId, id);
  }

  @Post(":id/cancel")
  async cancelInstance(@CurrentTenantId() tenantId: string, @Param("id") id: string) {
    return this.workflow.cancelInstance(tenantId, id);
  }

  @Post(":id/events")
  async sendEvent(
    @CurrentTenantId() tenantId: string,
    @Param("id") id: string,
    @Body() body: unknown
  ) {
    const input = SendWorkflowEventInputSchema.parse(body);
    return this.workflow.sendEvent(tenantId, id, input);
  }
}
