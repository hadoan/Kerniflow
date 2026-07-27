import { Injectable } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { type TransactionContext } from "@corely/kernel";
import { PrismaService, getPrismaClient } from "@corely/data";
import {
  type CashWorkspaceRepoPort,
  type CreateWorkspaceRecord,
} from "../../application/ports/cash-management.ports";
import type {
  CashAssistantWorkspaceEntity,
  CashAssistantWorkspaceType,
} from "../../domain/entities";

@Injectable()
export class PrismaCashWorkspaceRepository implements CashWorkspaceRepoPort {
  constructor(private readonly prisma: PrismaService) {}

  private getClient(tx?: TransactionContext): Prisma.TransactionClient {
    return getPrismaClient(this.prisma, tx);
  }

  async createWorkspace(
    data: CreateWorkspaceRecord,
    tx?: TransactionContext
  ): Promise<CashAssistantWorkspaceEntity> {
    const created = await this.getClient(tx).cashAssistantWorkspace.create({
      data: {
        tenantId: data.tenantId,
        workspaceId: data.workspaceId,
        registerId: data.registerId,
        locationId: data.locationId,
        type: data.type,
        businessDate: data.businessDate,
        businessMonth: data.businessMonth,
        conversationId: data.conversationId,
        cashDayId: data.cashDayId,
        createdByUserId: data.createdByUserId,
      },
    });

    return this.mapToEntity(created);
  }

  async findCanonicalWorkspace(
    tenantId: string,
    workspaceId: string,
    registerId: string | null,
    type: CashAssistantWorkspaceType,
    businessDate: Date | null,
    businessMonth: Date | null,
    tx?: TransactionContext
  ): Promise<CashAssistantWorkspaceEntity | null> {
    let where: Prisma.CashAssistantWorkspaceWhereInput = {
      tenantId,
      workspaceId,
      type,
    };

    if (type === "DAILY_CASH_DAY") {
      where = {
        ...where,
        registerId,
        businessDate,
      };
    } else if (type === "MONTHLY_REVIEW") {
      where = {
        ...where,
        registerId,
        businessMonth,
      };
    } else {
      // GENERAL_HELP does not have a canonical uniqueness by date/register
      return null;
    }

    const found = await this.getClient(tx).cashAssistantWorkspace.findFirst({
      where,
      orderBy: { createdAt: "desc" },
    });

    return found ? this.mapToEntity(found) : null;
  }

  async findWorkspaceByConversationId(
    tenantId: string,
    workspaceId: string,
    conversationId: string,
    tx?: TransactionContext
  ): Promise<CashAssistantWorkspaceEntity | null> {
    const found = await this.getClient(tx).cashAssistantWorkspace.findUnique({
      where: {
        conversationId,
      },
    });

    if (!found || found.tenantId !== tenantId || found.workspaceId !== workspaceId) {
      return null;
    }

    return this.mapToEntity(found);
  }

  async listWorkspaces(
    tenantId: string,
    workspaceId: string,
    tx?: TransactionContext
  ): Promise<CashAssistantWorkspaceEntity[]> {
    const models = await this.getClient(tx).cashAssistantWorkspace.findMany({
      where: {
        tenantId,
        workspaceId,
      },
    });

    return models.map((m) => this.mapToEntity(m));
  }

  private mapToEntity(model: any): CashAssistantWorkspaceEntity {
    return {
      id: model.id,
      tenantId: model.tenantId,
      workspaceId: model.workspaceId,
      registerId: model.registerId,
      locationId: model.locationId,
      type: model.type as CashAssistantWorkspaceType,
      businessDate: model.businessDate,
      businessMonth: model.businessMonth,
      conversationId: model.conversationId,
      cashDayId: model.cashDayId,
      createdByUserId: model.createdByUserId,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
      archivedAt: model.archivedAt,
    };
  }
}
