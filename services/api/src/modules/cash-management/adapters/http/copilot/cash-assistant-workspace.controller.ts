import { Controller, Post, Body, UseGuards, Get } from "@nestjs/common";
import { AuthGuard } from "../../../../identity/adapters/http/auth.guard";
import {
  CurrentTenantId,
  CurrentWorkspaceId,
  CurrentUserId,
} from "../../../../identity/adapters/http/current-user.decorator";
import { ResolveCashWorkspaceUseCase } from "../../../application/use-cases/copilot/resolve-cash-workspace.usecase";
import {
  CASH_WORKSPACE_REPO,
  type CashWorkspaceRepoPort,
} from "../../../application/ports/cash-management.ports";
import { Inject } from "@nestjs/common";
import { isErr } from "@corely/kernel";
import { z } from "zod";

const ResolveWorkspaceSchema = z.object({
  type: z.enum(["DAILY_CASH_DAY", "MONTHLY_REVIEW", "GENERAL_HELP"]),
  registerId: z.string().optional(),
  locationId: z.string().optional(),
  businessDate: z.string().optional(),
  businessMonth: z.string().optional(),
});

type ResolveWorkspaceDto = z.infer<typeof ResolveWorkspaceSchema>;

@Controller("cash-management/workspaces")
@UseGuards(AuthGuard)
export class CashAssistantWorkspaceController {
  constructor(
    private readonly resolveWorkspaceUseCase: ResolveCashWorkspaceUseCase,
    @Inject(CASH_WORKSPACE_REPO) private readonly workspaceRepo: CashWorkspaceRepoPort
  ) {}

  @Get()
  async list(@CurrentTenantId() tenantId: string, @CurrentWorkspaceId() workspaceId: string) {
    const workspaces = await this.workspaceRepo.listWorkspaces(tenantId, workspaceId);
    return { items: workspaces };
  }

  @Post("resolve")
  async resolve(
    @CurrentTenantId() tenantId: string,
    @CurrentWorkspaceId() workspaceId: string,
    @CurrentUserId() userId: string,
    @Body() body: ResolveWorkspaceDto
  ) {
    const validated = ResolveWorkspaceSchema.parse(body);

    const result = await this.resolveWorkspaceUseCase.execute(
      {
        type: validated.type,
        registerId: validated.registerId,
        locationId: validated.locationId,
        businessDate: validated.businessDate,
        businessMonth: validated.businessMonth,
      },
      {
        tenantId,
        workspaceId,
        userId,
      }
    );

    if (isErr(result)) {
      throw result.error;
    }

    return result.value.workspace;
  }
}
