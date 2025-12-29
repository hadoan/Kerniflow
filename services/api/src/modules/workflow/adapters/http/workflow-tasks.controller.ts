import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { CompleteWorkflowTaskInputSchema, FailWorkflowTaskInputSchema } from "@kerniflow/contracts";
import { WorkflowService } from "../../application/workflow.service";
import { CurrentTenantId } from "../../../identity/adapters/http/current-user.decorator";

@Controller("workflow")
export class WorkflowTasksController {
  constructor(private readonly workflow: WorkflowService) {}

  @Get("instances/:id/tasks")
  async listTasks(@CurrentTenantId() tenantId: string, @Param("id") id: string) {
    return this.workflow.listTasks(tenantId, id);
  }

  @Post("tasks/:taskId/complete")
  async completeTask(
    @CurrentTenantId() tenantId: string,
    @Param("taskId") taskId: string,
    @Body() body: unknown
  ) {
    const input = CompleteWorkflowTaskInputSchema.parse(body);
    return this.workflow.completeTask(tenantId, taskId, input);
  }

  @Post("tasks/:taskId/fail")
  async failTask(
    @CurrentTenantId() tenantId: string,
    @Param("taskId") taskId: string,
    @Body() body: unknown
  ) {
    const input = FailWorkflowTaskInputSchema.parse(body);
    return this.workflow.failTask(tenantId, taskId, input.error ?? {});
  }
}
