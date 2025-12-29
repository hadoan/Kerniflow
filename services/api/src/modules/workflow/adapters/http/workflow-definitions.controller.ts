import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import {
  CreateWorkflowDefinitionInputSchema,
  ListWorkflowDefinitionsQuerySchema,
} from "@kerniflow/contracts";
import { WorkflowService } from "../../application/workflow.service";
import {
  CurrentTenantId,
  CurrentUserId,
} from "../../../identity/adapters/http/current-user.decorator";

@Controller("workflow/definitions")
export class WorkflowDefinitionsController {
  constructor(private readonly workflow: WorkflowService) {}

  @Post()
  async createDefinition(
    @CurrentTenantId() tenantId: string,
    @CurrentUserId() userId: string | undefined,
    @Body() body: unknown
  ) {
    const input = CreateWorkflowDefinitionInputSchema.parse({
      ...(body as object),
      createdBy: userId,
    });

    // TODO: add RBAC checks for workflow definition creation
    return this.workflow.createDefinition(tenantId, input);
  }

  @Get()
  async listDefinitions(@CurrentTenantId() tenantId: string, @Query() query: unknown) {
    const filters = ListWorkflowDefinitionsQuerySchema.parse(query);
    return this.workflow.listDefinitions(tenantId, filters);
  }

  @Get(":id")
  async getDefinition(@CurrentTenantId() tenantId: string, @Param("id") id: string) {
    return this.workflow.getDefinition(tenantId, id);
  }

  @Post(":id/activate")
  async activate(@CurrentTenantId() tenantId: string, @Param("id") id: string) {
    return this.workflow.setDefinitionStatus(tenantId, id, "ACTIVE");
  }

  @Post(":id/deactivate")
  async deactivate(@CurrentTenantId() tenantId: string, @Param("id") id: string) {
    return this.workflow.setDefinitionStatus(tenantId, id, "INACTIVE");
  }
}
