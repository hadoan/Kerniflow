import { Injectable } from "@nestjs/common";
import { PrismaService } from "@kerniflow/data";
import type { TransactionContext } from "@kerniflow/kernel";
import {
  type SeededRecordMetaRepositoryPort,
  type SeededRecordMetaEntity,
  type CreateSeededRecordMetaDto,
} from "../../application/ports/seeded-record-meta-repository.port";

function getPrismaClient(prisma: PrismaService, tx?: TransactionContext) {
  return tx?.prisma ?? prisma;
}

@Injectable()
export class PrismaSeededRecordMetaRepositoryAdapter implements SeededRecordMetaRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findByTarget(
    tenantId: string,
    targetTable: string,
    targetId: string,
    tx?: TransactionContext
  ): Promise<SeededRecordMetaEntity | null> {
    const client = getPrismaClient(this.prisma, tx);

    return await client.seededRecordMeta.findUnique({
      where: {
        tenantId_targetTable_targetId: {
          tenantId,
          targetTable,
          targetId,
        },
      },
    });
  }

  async create(
    data: CreateSeededRecordMetaDto,
    tx?: TransactionContext
  ): Promise<SeededRecordMetaEntity> {
    const client = getPrismaClient(this.prisma, tx);

    return await client.seededRecordMeta.create({
      data: {
        id: data.id,
        tenantId: data.tenantId,
        targetTable: data.targetTable,
        targetId: data.targetId,
        sourceTemplateId: data.sourceTemplateId,
        sourceTemplateVersion: data.sourceTemplateVersion,
        isCustomized: data.isCustomized ?? false,
      },
    });
  }

  async markAsCustomized(
    tenantId: string,
    targetTable: string,
    targetId: string,
    userId: string,
    tx?: TransactionContext
  ): Promise<void> {
    const client = getPrismaClient(this.prisma, tx);

    await client.seededRecordMeta.updateMany({
      where: {
        tenantId,
        targetTable,
        targetId,
      },
      data: {
        isCustomized: true,
        customizedAt: new Date(),
        customizedByUserId: userId,
      },
    });
  }

  async listByTemplate(
    tenantId: string,
    sourceTemplateId: string,
    tx?: TransactionContext
  ): Promise<SeededRecordMetaEntity[]> {
    const client = getPrismaClient(this.prisma, tx);

    return await client.seededRecordMeta.findMany({
      where: {
        tenantId,
        sourceTemplateId,
      },
      orderBy: { createdAt: "asc" },
    });
  }

  async isCustomized(
    tenantId: string,
    targetTable: string,
    targetId: string,
    tx?: TransactionContext
  ): Promise<boolean> {
    const client = getPrismaClient(this.prisma, tx);

    const record = await client.seededRecordMeta.findUnique({
      where: {
        tenantId_targetTable_targetId: {
          tenantId,
          targetTable,
          targetId,
        },
      },
      select: { isCustomized: true },
    });

    return record?.isCustomized ?? false;
  }
}
