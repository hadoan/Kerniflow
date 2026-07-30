import { Controller, Post, Body, UseGuards, Get, Param, Headers } from "@nestjs/common";
import { AuthGuard } from "../../../../identity/adapters/http/auth.guard";
import {
  CurrentTenantId,
  CurrentWorkspaceId,
  CurrentUserId,
} from "../../../../identity/adapters/http/current-user.decorator";
import { ResolveCashWorkspaceUseCase } from "../../../application/use-cases/copilot/resolve-cash-workspace.usecase";
import {
  CASH_WORKSPACE_REPO,
  CASH_WORKSPACE_HANDOFF_REPO,
  type CashWorkspaceRepoPort,
  type CashWorkspaceHandoffRepoPort,
} from "../../../application/ports/cash-management.ports";
import { Inject } from "@nestjs/common";
import { isErr, NotFoundError, RequireTenant, ValidationError } from "@corely/kernel";
import {
  ResolveCashAssistantWorkspaceInputSchema,
  CashWorkspaceHandoffDto,
  AnswerCashMovementResolutionInputSchema,
} from "@corely/contracts";
import { ConfirmHandoffUseCase } from "../../../application/use-cases/confirm-handoff.usecase";
import { OpenCashDayWorkspaceUseCase } from "../../../application/use-cases/copilot/open-cash-day-workspace.usecase";
import { AnswerCashMovementResolutionUseCase } from "../../../application/use-cases/copilot/answer-cash-movement-resolution.usecase";
import { PrismaService } from "@corely/data";

@Controller("cash-management/workspaces")
@UseGuards(AuthGuard)
export class CashAssistantWorkspaceController {
  constructor(
    @Inject(CASH_WORKSPACE_REPO) private readonly workspaceRepo: CashWorkspaceRepoPort,
    @Inject(CASH_WORKSPACE_HANDOFF_REPO)
    private readonly handoffRepo: CashWorkspaceHandoffRepoPort,
    private readonly resolveWorkspaceUseCase: ResolveCashWorkspaceUseCase,
    private readonly confirmHandoffUseCase: ConfirmHandoffUseCase,
    private readonly openCashDayWorkspaceUseCase: OpenCashDayWorkspaceUseCase,
    private readonly answerCashMovementResolutionUseCase: AnswerCashMovementResolutionUseCase,
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

  @Get("conversations/:conversationId/handoffs/:id")
  async getHandoff(
    @CurrentTenantId() tenantId: string,
    @CurrentWorkspaceId() workspaceId: string,
    @Param("conversationId") conversationId: string,
    @Param("id") id: string
  ): Promise<CashWorkspaceHandoffDto> {
    const handoff = await this.handoffRepo.findHandoffById(tenantId, id);
    if (
      !handoff ||
      handoff.targetWorkspaceId !== workspaceId ||
      handoff.sourceConversationId !== conversationId
    ) {
      throw new NotFoundError("Handoff not found");
    }

    const register = await this.prisma.cashRegister.findFirst({
      where: { id: handoff.registerId, tenantId },
      select: { id: true, name: true },
    });

    const confirmation = handoff.confirmationId
      ? await this.prisma.cashEntryConfirmation.findFirst({
          where: { id: handoff.confirmationId, tenantId },
          select: { id: true, version: true },
        })
      : null;

    return {
      id: handoff.id,
      status: handoff.status as any,
      viewedAt: handoff.viewedAt?.toISOString(),
      expiresAt: handoff.expiresAt.toISOString(),

      confirmation: confirmation
        ? {
            id: confirmation.id,
            version: confirmation.version,
          }
        : { id: "", version: 1 },

      context: {
        conversationId: handoff.sourceConversationId,
        workspaceId: handoff.targetWorkspaceId,
        businessDate: handoff.businessDate,
        register: register ?? { id: handoff.registerId, name: "Unknown Register" },
      },

      movement: {
        type: handoff.movementType,
        amountCents: handoff.amountCents,
        formattedAmount: (handoff.amountCents / 100).toFixed(2), // Simplistic, frontend handles i18n
        description: handoff.description,

        display: {
          label: handoff.movementType,
          explanation: handoff.description,
        },

        evidence: handoff.evidenceRequirement
          ? {
              type: handoff.evidenceRequirement,
              label: handoff.evidenceRequirement,
            }
          : null,
      },
    };
  }

  @Post("conversations/:conversationId/handoffs/:handoffId/confirm")
  async confirmHandoff(
    @CurrentTenantId() tenantId: string,
    @CurrentWorkspaceId() workspaceId: string,
    @CurrentUserId() userId: string,
    @Param("conversationId") conversationId: string,
    @Param("handoffId") handoffId: string,
    @Headers("idempotency-key") idempotencyKey: string
  ) {
    if (!idempotencyKey) {
      throw new ValidationError("idempotency-key header is required");
    }
    const result = await this.confirmHandoffUseCase.execute(
      {
        handoffId,
        expectedConversationId: conversationId,
        idempotencyKey,
      },
      { tenantId, workspaceId, userId }
    );
    if (isErr(result)) {
      throw result.error;
    }
    return result.value;
  }

  @Post("conversations/:conversationId/handoffs/:handoffId/cancel")
  async cancelHandoff(
    @CurrentTenantId() tenantId: string,
    @CurrentWorkspaceId() workspaceId: string,
    @Param("conversationId") conversationId: string,
    @Param("handoffId") handoffId: string
  ) {
    const handoff = await this.handoffRepo.findHandoffById(tenantId, handoffId);
    if (
      !handoff ||
      handoff.targetWorkspaceId !== workspaceId ||
      handoff.sourceConversationId !== conversationId
    ) {
      throw new NotFoundError("Handoff not found");
    }
    await this.handoffRepo.markHandoffCancelled(handoffId);

    if (handoff.confirmationId) {
      // Need a port to cancel confirmation. Let's use prisma directly here or use case.
      await this.prisma.cashEntryConfirmation.update({
        where: { id: handoff.confirmationId },
        data: { status: "CANCELLED" },
      });
    }

    return { success: true };
  }

  @Post("conversations/:conversationId/handoffs/:handoffId/view")
  async viewHandoff(
    @CurrentTenantId() tenantId: string,
    @CurrentWorkspaceId() workspaceId: string,
    @CurrentUserId() userId: string,
    @Param("conversationId") conversationId: string,
    @Param("handoffId") handoffId: string
  ) {
    const handoff = await this.handoffRepo.findHandoffById(tenantId, handoffId);
    if (
      !handoff ||
      handoff.targetWorkspaceId !== workspaceId ||
      handoff.sourceConversationId !== conversationId
    ) {
      throw new NotFoundError("Handoff not found");
    }
    await this.handoffRepo.markHandoffViewed(handoffId, userId);
    return { success: true };
  }

  @Post("conversations/:conversationId/resolutions/:resolutionId/answer")
  async answerResolution(
    @CurrentTenantId() tenantId: string,
    @CurrentWorkspaceId() workspaceId: string,
    @CurrentUserId() userId: string,
    @Param("conversationId") conversationId: string,
    @Param("resolutionId") resolutionId: string,
    @Body() body: { expectedVersion: number; answer: any }
  ) {
    if (!body.answer || typeof body.expectedVersion !== "number") {
      throw new ValidationError(
        "Invalid payload. Expected 'answer' object and 'expectedVersion' number."
      );
    }

    const result = await this.answerCashMovementResolutionUseCase.execute(
      {
        resolutionId,
        expectedVersion: body.expectedVersion,
        answer: body.answer,
      },
      { tenantId, workspaceId, userId }
    );

    if (isErr(result)) {
      throw result.error;
    }

    return result.value;
  }
}
