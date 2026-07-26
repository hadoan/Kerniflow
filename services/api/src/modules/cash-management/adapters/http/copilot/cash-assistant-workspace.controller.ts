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
import { ResolveCashAssistantWorkspaceInputSchema } from "@corely/contracts";
import { PrismaService } from "@corely/data";

@Controller("cash-management/workspaces")
@UseGuards(AuthGuard)
export class CashAssistantWorkspaceController {
  constructor(
    private readonly resolveWorkspaceUseCase: ResolveCashWorkspaceUseCase,
    @Inject(CASH_WORKSPACE_REPO) private readonly workspaceRepo: CashWorkspaceRepoPort,
    private readonly prisma: PrismaService
  ) {}

  @Get()
  async list(@CurrentTenantId() tenantId: string, @CurrentWorkspaceId() workspaceId: string) {
    const workspaces = await this.workspaceRepo.listWorkspaces(tenantId, workspaceId);
    const registers = await this.prisma.cashRegister.findMany({
      where: { tenantId, workspaceId },
      select: { id: true, name: true, location: true, currency: true },
    });
    const regMap = new Map(registers.map((r) => [r.id, r]));

    const items = workspaces.map((ws) => ({
      ...ws,
      register: ws.registerId ? (regMap.get(ws.registerId) ?? null) : null,
    }));

    return { items };
  }

  @Post("resolve")
  async resolve(
    @CurrentTenantId() tenantId: string,
    @CurrentWorkspaceId() workspaceId: string,
    @CurrentUserId() userId: string,
    @Body() body: unknown
  ) {
    const validated = ResolveCashAssistantWorkspaceInputSchema.parse(body);

    const result = await this.resolveWorkspaceUseCase.execute(
      {
        type: validated.type,
        conversationId: validated.conversationId,
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

    const ws = result.value.workspace;
    let registerSummary = null;
    if (ws.registerId) {
      registerSummary = await this.prisma.cashRegister.findFirst({
        where: { id: ws.registerId, tenantId, workspaceId },
        select: { id: true, name: true, location: true, currency: true },
      });
    }

    return {
      ...ws,
      register: registerSummary,
    };
  }
}
