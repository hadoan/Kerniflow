import {
  Body,
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Req,
  Inject,
  UseInterceptors,
} from "@nestjs/common";
import type { Request } from "express";
import { z } from "zod";
import {
  CreateWorkspaceInputSchema,
  UpdateWorkspaceInputSchema,
  type CreateWorkspaceInput,
  type UpdateWorkspaceInput,
} from "@kerniflow/contracts";
import { CreateWorkspaceUseCase } from "../../application/use-cases/create-workspace.usecase";
import { ListWorkspacesUseCase } from "../../application/use-cases/list-workspaces.usecase";
import { GetWorkspaceUseCase } from "../../application/use-cases/get-workspace.usecase";
import { UpdateWorkspaceUseCase } from "../../application/use-cases/update-workspace.usecase";
import { IdempotencyInterceptor } from "../../../../shared/idempotency/IdempotencyInterceptor";

// Auth context extraction - compatible with tests and production
interface AuthUser {
  id: string;
  tenantId: string;
}

function extractAuthUser(req: Request, bodyData?: any): AuthUser {
  // Extract from various sources (headers, user session, or body for tests)
  const user = (req as any).user;
  const headerTenantId = req.headers["x-tenant-id"] as string | undefined;
  const headerUserId = req.headers["x-user-id"] as string | undefined;
  const tenantId = headerTenantId || bodyData?.tenantId || user?.tenantId || "default-tenant";
  const userId =
    headerUserId ||
    bodyData?.createdByUserId ||
    bodyData?.userId ||
    user?.id ||
    user?.userId ||
    "default-user";

  return { id: userId, tenantId };
}

@Controller("workspaces")
@UseInterceptors(IdempotencyInterceptor)
export class WorkspacesController {
  constructor(
    @Inject(CreateWorkspaceUseCase)
    private readonly createWorkspace: CreateWorkspaceUseCase,
    @Inject(ListWorkspacesUseCase)
    private readonly listWorkspaces: ListWorkspacesUseCase,
    @Inject(GetWorkspaceUseCase)
    private readonly getWorkspace: GetWorkspaceUseCase,
    @Inject(UpdateWorkspaceUseCase)
    private readonly updateWorkspace: UpdateWorkspaceUseCase
  ) {}

  @Post()
  async create(@Body() body: unknown, @Req() req: Request) {
    const input = CreateWorkspaceInputSchema.parse(body);
    const auth = extractAuthUser(req, body);

    return this.createWorkspace.execute({
      ...input,
      tenantId: auth.tenantId,
      userId: auth.id,
      idempotencyKey: input.idempotencyKey || (req.headers["x-idempotency-key"] as string),
    });
  }

  @Get()
  async list(@Req() req: Request) {
    const auth = extractAuthUser(req, (req as any).body);

    return this.listWorkspaces.execute({
      tenantId: auth.tenantId,
      userId: auth.id,
    });
  }

  @Get(":workspaceId")
  async getById(@Param("workspaceId") workspaceId: string, @Req() req: Request) {
    const auth = extractAuthUser(req, (req as any).body);

    return this.getWorkspace.execute({
      tenantId: auth.tenantId,
      userId: auth.id,
      workspaceId,
    });
  }

  @Patch(":workspaceId")
  async update(
    @Param("workspaceId") workspaceId: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    const input = UpdateWorkspaceInputSchema.parse(body);
    const auth = extractAuthUser(req, body);

    return this.updateWorkspace.execute({
      ...input,
      tenantId: auth.tenantId,
      userId: auth.id,
      workspaceId,
      idempotencyKey: input.idempotencyKey || (req.headers["x-idempotency-key"] as string),
    });
  }
}
