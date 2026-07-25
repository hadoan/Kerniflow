import { Inject, Injectable } from "@nestjs/common";
import {
  BaseUseCase,
  RequireTenant,
  UseCaseContext,
  UNIT_OF_WORK,
  type UnitOfWorkPort,
  ok,
  Result,
  UseCaseError,
  ValidationError,
} from "@corely/kernel";
import { CASH_WORKSPACE_REPO, type CashWorkspaceRepoPort } from "../../ports/cash-management.ports";
import type {
  CashAssistantWorkspaceType,
  CashAssistantWorkspaceEntity,
} from "../../../domain/entities";
import { PrismaService } from "@corely/data";
import { nanoid } from "nanoid";
import { parseISO, startOfMonth } from "date-fns";

export type ResolveCashWorkspaceCommand = {
  type: CashAssistantWorkspaceType;
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

    const { type, registerId, locationId, businessDate, businessMonth } = input;

    let parsedDate: Date | null = null;
    let parsedMonth: Date | null = null;

    if (type === "DAILY_CASH_DAY") {
      if (!businessDate || !registerId || !locationId) {
        throw new ValidationError("DAILY_CASH_DAY requires businessDate, registerId, locationId");
      }
      parsedDate = parseISO(businessDate);
    } else if (type === "MONTHLY_REVIEW") {
      if (!businessMonth || !registerId || !locationId) {
        throw new ValidationError("MONTHLY_REVIEW requires businessMonth, registerId, locationId");
      }
      parsedMonth = startOfMonth(parseISO(businessMonth));
    } else if (type === "GENERAL_HELP") {
      // no specific date requirements
    } else {
      throw new ValidationError("Invalid workspace type");
    }

    // Try to find existing
    if (type !== "GENERAL_HELP") {
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

    // Does not exist (or is general help), create new
    return this.unitOfWork.withinTransaction(async (tx) => {
      const conversationId = nanoid();

      // Ensure AgentRun exists
      const pTx = tx as any; // Using Prisma directly to bypass cycle
      await pTx.agentRun.create({
        data: {
          id: conversationId,
          tenantId,
          createdByUserId: ctx.userId ?? "system",
          status: "ACTIVE",
          title: this.getGeneratedTitle(type, businessDate, businessMonth),
        },
      });

      try {
        const created = await this.workspaceRepo.createWorkspace(
          {
            tenantId,
            workspaceId,
            registerId: registerId ?? null,
            locationId: locationId ?? null,
            type,
            businessDate: parsedDate,
            businessMonth: parsedMonth,
            conversationId,
            cashDayId: null,
            createdByUserId: ctx.userId ?? "system",
          },
          tx
        );
        return ok({ workspace: created });
      } catch (error: any) {
        if (error.code === "P2002") {
          // Unique constraint violation - another request created it first
          const existing = await this.workspaceRepo.findCanonicalWorkspace(
            tenantId,
            workspaceId,
            registerId ?? null,
            type,
            parsedDate,
            parsedMonth,
            tx
          );
          if (existing) {
            return ok({ workspace: existing });
          }
        }
        throw error;
      }
    });
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
