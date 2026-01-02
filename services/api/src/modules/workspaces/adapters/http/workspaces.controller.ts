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
  UseGuards,
  BadRequestException,
} from "@nestjs/common";
import type { Request } from "express";
import { z } from "zod";
import {
  CreateWorkspaceInputSchema,
  UpdateWorkspaceInputSchema,
  type CreateWorkspaceInput,
  type UpdateWorkspaceInput,
} from "@corely/contracts";
import { CreateWorkspaceUseCase } from "../../application/use-cases/create-workspace.usecase";
import { ListWorkspacesUseCase } from "../../application/use-cases/list-workspaces.usecase";
import { GetWorkspaceUseCase } from "../../application/use-cases/get-workspace.usecase";
import { UpdateWorkspaceUseCase } from "../../application/use-cases/update-workspace.usecase";
import { IdempotencyInterceptor } from "../../../../shared/infrastructure/idempotency/IdempotencyInterceptor";
import { AuthGuard } from "../../../identity/adapters/http/auth.guard";

// Auth context extraction - compatible with tests and production
interface AuthUser {
  id: string;
  tenantId: string;
}

function extractAuthUser(req: Request, bodyData?: any): AuthUser {
  // Extract from various sources (headers, user session, or body for tests)
  const user = (req as any).user;
  const requestTenantId = (req as any).tenantId;
  const headerTenantId = req.headers["x-tenant-id"] as string | undefined;
  const headerUserId = req.headers["x-user-id"] as string | undefined;
  const tenantId = requestTenantId || headerTenantId || bodyData?.tenantId || user?.tenantId;
  const userId =
    headerUserId || bodyData?.createdByUserId || bodyData?.userId || user?.userId || user?.id;

  if (!tenantId) {
    throw new BadRequestException("Missing tenantId in request context");
  }
  if (!userId) {
    throw new BadRequestException("Missing userId in request context");
  }

  return { id: userId, tenantId };
}

@Controller("workspaces")
@UseGuards(AuthGuard)
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
