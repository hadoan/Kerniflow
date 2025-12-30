import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import { Register } from "../../domain/register.aggregate";
import type { RegisterRepositoryPort } from "../../application/ports/register-repository.port";

@Injectable()
export class PrismaRegisterRepositoryAdapter implements RegisterRepositoryPort {
  constructor(private prisma: PrismaService) {}

  async findById(workspaceId: string, registerId: string): Promise<Register | null> {
    const record = await this.prisma.register.findUnique({
      where: {
        id: registerId,
        workspaceId,
      },
    });

    return record ? this.toDomain(record) : null;
  }

  async findByWorkspace(workspaceId: string, status?: "ACTIVE" | "INACTIVE"): Promise<Register[]> {
    const records = await this.prisma.register.findMany({
      where: {
        workspaceId,
        ...(status && { status }),
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return records.map((r) => this.toDomain(r));
  }

  async existsByName(workspaceId: string, name: string): Promise<boolean> {
    const count = await this.prisma.register.count({
      where: {
        workspaceId,
        name,
      },
    });

    return count > 0;
  }

  async save(register: Register): Promise<void> {
    await this.prisma.register.create({
      data: {
        id: register.id,
        workspaceId: register.workspaceId,
        name: register.name,
        defaultWarehouseId: register.defaultWarehouseId,
        defaultBankAccountId: register.defaultBankAccountId,
        status: register.status,
        createdAt: register.createdAt,
        updatedAt: register.updatedAt,
      },
    });
  }

  async update(register: Register): Promise<void> {
    await this.prisma.register.update({
      where: {
        id: register.id,
      },
      data: {
        name: register.name,
        defaultWarehouseId: register.defaultWarehouseId,
        defaultBankAccountId: register.defaultBankAccountId,
        status: register.status,
        updatedAt: register.updatedAt,
      },
    });
  }

  private toDomain(record: any): Register {
    return new Register(
      record.id,
      record.workspaceId,
      record.name,
      record.defaultWarehouseId,
      record.defaultBankAccountId,
      record.status as "ACTIVE" | "INACTIVE",
      record.createdAt,
      record.updatedAt
    );
  }
}
