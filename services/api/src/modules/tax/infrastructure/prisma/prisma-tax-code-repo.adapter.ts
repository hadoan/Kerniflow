import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import type { TaxCodeKind } from "@corely/contracts";
import { TaxCodeRepoPort } from "../../domain/ports";
import type { TaxCodeEntity } from "../../domain/entities";

@Injectable()
export class PrismaTaxCodeRepoAdapter extends TaxCodeRepoPort {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async create(
    code: Omit<TaxCodeEntity, "id" | "createdAt" | "updatedAt">
  ): Promise<TaxCodeEntity> {
    const created = await this.prisma.taxCode.create({
      data: {
        tenantId: code.tenantId,
        code: code.code,
        kind: code.kind,
        label: code.label,
        isActive: code.isActive,
      },
    });

    return this.toDomain(created);
  }

  async findById(id: string, tenantId: string): Promise<TaxCodeEntity | null> {
    const code = await this.prisma.taxCode.findUnique({
      where: { id, tenantId },
    });

    return code ? this.toDomain(code) : null;
  }

  async findByCode(code: string, tenantId: string): Promise<TaxCodeEntity | null> {
    const found = await this.prisma.taxCode.findUnique({
      where: { tenantId_code: { tenantId, code } },
    });

    return found ? this.toDomain(found) : null;
  }

  async findByKind(kind: TaxCodeKind, tenantId: string): Promise<TaxCodeEntity[]> {
    const codes = await this.prisma.taxCode.findMany({
      where: { tenantId, kind },
      orderBy: { createdAt: "desc" },
    });

    return codes.map((c) => this.toDomain(c));
  }

  async findAll(tenantId: string, activeOnly = false): Promise<TaxCodeEntity[]> {
    const codes = await this.prisma.taxCode.findMany({
      where: {
        tenantId,
        ...(activeOnly ? { isActive: true } : {}),
      },
      orderBy: { code: "asc" },
    });

    return codes.map((c) => this.toDomain(c));
  }

  async update(
    id: string,
    tenantId: string,
    updates: Partial<Pick<TaxCodeEntity, "label" | "isActive" | "kind">>
  ): Promise<TaxCodeEntity> {
    const updated = await this.prisma.taxCode.update({
      where: { id, tenantId },
      data: updates,
    });

    return this.toDomain(updated);
  }

  async delete(id: string, tenantId: string): Promise<void> {
    await this.prisma.taxCode.delete({
      where: { id, tenantId },
    });
  }

  private toDomain(model: any): TaxCodeEntity {
    return {
      id: model.id,
      tenantId: model.tenantId,
      code: model.code,
      kind: model.kind,
      label: model.label,
      isActive: model.isActive,
      createdAt: model.createdAt,
      updatedAt: model.updatedAt,
    };
  }
}
