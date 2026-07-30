import { Inject, Injectable } from "@nestjs/common";
import {
  BaseUseCase,
  RequireTenant,
  UseCaseContext,
  UNIT_OF_WORK,
  type UnitOfWorkPort,
  ok,
  err,
  Result,
  UseCaseError,
  ValidationError,
  ConflictError,
  NotFoundError,
} from "@corely/kernel";
import { CASH_WORKSPACE_REPO, type CashWorkspaceRepoPort } from "../../ports/cash-management.ports";
import type {
  CashAssistantWorkspaceType,
  CashAssistantWorkspaceEntity,
} from "../../../domain/entities";
import { PrismaService } from "@corely/data";
import type { Prisma } from "@prisma/client";
import { nanoid } from "nanoid";
import { parseISO, startOfMonth } from "date-fns";

export type ResolveCashWorkspaceCommand = {
  type: CashAssistantWorkspaceType;
  conversationId?: string;
  registerId?: string;
  locationId?: string;
  businessDate?: string;
  businessMonth?: string;
};

@RequireTenant()
@Injectable()
export class ResolveCashWorkspaceUseCase extends BaseUseCase<
  ResolveCashWorkspaceCommand,
  { workspace: CashAssistantWorkspaceEntity }
> {
  constructor(
    @Inject(CASH_WORKSPACE_REPO)
    private readonly workspaceRepo: CashWorkspaceRepoPort,
    @Inject(UNIT_OF_WORK)
    private readonly unitOfWork: UnitOfWorkPort,
    private readonly prisma: PrismaService
  ) {
    super({ logger: undefined });
  }

  protected async handle(
    input: ResolveCashWorkspaceCommand,
    ctx: UseCaseContext
  ): Promise<Result<{ workspace: CashAssistantWorkspaceEntity }, UseCaseError>> {
    const tenantId = ctx.tenantId;
    const workspaceId = ctx.workspaceId;
    if (!tenantId || !workspaceId) {
      throw new ValidationError("Missing tenant or workspace context");
    }

    const { type, conversationId, registerId, locationId, businessDate, businessMonth } = input;
    const conversationTenantId = workspaceId;
    const conversationUserId = ctx.userId ?? "system";

    let parsedDate: Date | null = null;
    let parsedMonth: Date | null = null;

    if (type === "DAILY_CASH_DAY") {
      if (!businessDate || !registerId) {
        throw new ValidationError("DAILY_CASH_DAY requires businessDate and registerId");
      }
      parsedDate = parseISO(businessDate);
    } else if (type === "MONTHLY_REVIEW") {
      if (!businessMonth || !registerId) {
        throw new ValidationError("MONTHLY_REVIEW requires businessMonth and registerId");
      }
      parsedMonth = startOfMonth(parseISO(businessMonth));
    } else if (type === "GENERAL_HELP") {
      // General help can be created with or without registerId initially, but registerId is required for binding
    } else {
      throw new ValidationError("Invalid workspace type");
    }

    if (registerId) {
      const reg = await this.prisma.cashRegister.findFirst({
        where: { id: registerId, tenantId, workspaceId },
      });
      if (!reg) {
        return err(new NotFoundError("Cash register not found"));
      }
    }

    // 1. A supplied conversation must be an existing Copilot thread owned by this user.
    // Copilot scopes AgentRun.tenantId to workspaceId, whereas cash records use the business tenantId.
    if (conversationId) {
      const conversation = await this.prisma.agentRun.findFirst({
        where: {
          id: conversationId,
          tenantId: conversationTenantId,
          createdByUserId: conversationUserId,
        },
        select: { id: true },
      });
      if (!conversation) {
        return err(new NotFoundError("Conversation not found"));
      }

      const existing = await this.workspaceRepo.findWorkspaceByConversationId(
        tenantId,
        workspaceId,
        conversationId
      );

      if (existing) {
        if (existing.registerId) {
          if (registerId && existing.registerId !== registerId) {
            return err(new ConflictError("Cannot rebind conversation to a different register"));
          }
          return ok({ workspace: existing });
        } else if (registerId) {
          // Bind legacy unbound conversation to the provided registerId
          const updated = await this.prisma.cashAssistantWorkspace.update({
            where: { id: existing.id },
            data: { registerId },
          });
          return ok({
            workspace: {
              ...existing,
              registerId: updated.registerId,
              updatedAt: updated.updatedAt,
            },
          });
        }
        return ok({ workspace: existing });
      }
    }

    // 2. Canonical workspace lookup for non-GENERAL_HELP without conversationId
    if (!conversationId && type !== "GENERAL_HELP") {
      const existing = await this.workspaceRepo.findCanonicalWorkspace(
        tenantId,
        workspaceId,
        registerId ?? null,
        type,
        parsedDate,
        parsedMonth
      );
      if (existing) {
        return ok({ workspace: existing });
      }
    }

    // 3. Create a cash workspace and its Copilot conversation atomically when needed.
    const targetConversationId = conversationId ?? nanoid();
    try {
      return await this.unitOfWork.withinTransaction(async (tx) => {
        const pTx = tx as unknown as Prisma.TransactionClient;

        if (!conversationId) {
          await pTx.agentRun.create({
            data: {
              id: targetConversationId,
              tenantId: conversationTenantId,
              createdByUserId: conversationUserId,
              status: "running",
              title: this.getGeneratedTitle(type, businessDate, businessMonth),
            },
          });
        }

        const created = await this.workspaceRepo.createWorkspace(
          {
            tenantId,
            workspaceId,
            registerId: registerId ?? null,
            locationId: locationId ?? null,
            type,
            businessDate: parsedDate,
            businessMonth: parsedMonth,
            conversationId: targetConversationId,
            cashDayId: null,
            createdByUserId: conversationUserId,
          },
          tx
        );
        return ok({ workspace: created });
      });
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        error.code === "P2002"
      ) {
        const existing =
          !conversationId && type !== "GENERAL_HELP"
            ? await this.workspaceRepo.findCanonicalWorkspace(
                tenantId,
                workspaceId,
                registerId ?? null,
                type,
                parsedDate,
                parsedMonth
              )
            : await this.workspaceRepo.findWorkspaceByConversationId(
                tenantId,
                workspaceId,
                targetConversationId
              );
        if (existing) {
          return ok({ workspace: existing });
        }
      }
      throw error;
    }
  }

  private getGeneratedTitle(
    type: CashAssistantWorkspaceType,
    businessDate?: string,
    businessMonth?: string
  ): string {
    if (type === "DAILY_CASH_DAY") {
      return `Tagesabschluss ${businessDate}`;
    }
    if (type === "MONTHLY_REVIEW") {
      return `Monatsabschluss ${businessMonth}`;
    }
    return "Cash Assistant Help";
  }
}
