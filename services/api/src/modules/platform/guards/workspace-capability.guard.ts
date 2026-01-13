import { Injectable, CanActivate, ExecutionContext, SetMetadata } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ForbiddenError } from "@corely/kernel";
import { WorkspaceTemplateService } from "../application/services/workspace-template.service";
import {
  WORKSPACE_REPOSITORY_PORT,
  type WorkspaceRepositoryPort,
} from "../../workspaces/application/ports/workspace-repository.port";
import { Inject } from "@nestjs/common";

export const REQUIRE_WORKSPACE_CAPABILITY = "require_workspace_capability";

@Injectable()
export class WorkspaceCapabilityGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly templateService: WorkspaceTemplateService,
    @Inject(WORKSPACE_REPOSITORY_PORT)
    private readonly workspaceRepo: WorkspaceRepositoryPort
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredCapability = this.reflector.getAllAndOverride<string>(
      REQUIRE_WORKSPACE_CAPABILITY,
      [context.getHandler(), context.getClass()]
    );

    if (!requiredCapability) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const tenantId = request.tenantId;
    const workspaceHeader = request.headers["x-workspace-id"];
    const workspaceId =
      (Array.isArray(workspaceHeader) ? workspaceHeader[0] : workspaceHeader) ||
      request.params?.workspaceId ||
      request.body?.workspaceId;

    if (!tenantId) {
      throw new ForbiddenError("Tenant context not found", {
        code: "Workspace:NoTenantContext",
      });
    }

    if (!workspaceId) {
      throw new ForbiddenError("Workspace context not found", {
        code: "Workspace:NoWorkspaceContext",
      });
    }

    const workspace = await this.workspaceRepo.getWorkspaceByIdWithLegalEntity(
      tenantId,
      workspaceId
    );
    if (!workspace || !workspace.legalEntity) {
      throw new ForbiddenError("Workspace not found", {
        code: "Workspace:NotFound",
      });
    }

    const workspaceKind = workspace.legalEntity.kind === "COMPANY" ? "COMPANY" : "PERSONAL";
    const capabilities = this.templateService.getDefaultCapabilities(workspaceKind);

    if (!capabilities[requiredCapability as keyof typeof capabilities]) {
      throw new ForbiddenError(`Capability "${requiredCapability}" is not available`, {
        code: "Workspace:CapabilityNotAvailable",
      });
    }

    return true;
  }
}

export const RequireWorkspaceCapability = (capability: string) =>
  SetMetadata(REQUIRE_WORKSPACE_CAPABILITY, capability);
