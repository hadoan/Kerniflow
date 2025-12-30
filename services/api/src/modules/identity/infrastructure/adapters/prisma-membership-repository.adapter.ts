import { Injectable, Inject } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import { Membership } from "../../domain/entities/membership.entity";
import { MembershipRepositoryPort } from "../../application/ports/membership-repository.port";

/**
 * Prisma Membership Repository Implementation
 */
@Injectable()
export class PrismaMembershipRepository implements MembershipRepositoryPort {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(membership: Membership): Promise<Membership> {
    const data = await this.prisma.membership.create({
      data: {
        id: membership.getId(),
        tenantId: membership.getTenantId(),
        userId: membership.getUserId(),
        roleId: membership.getRoleId(),
        createdAt: membership.getCreatedAt(),
      },
    });

    return Membership.restore(data);
  }

  async findById(id: string): Promise<Membership | null> {
    const data = await this.prisma.membership.findUnique({
      where: { id },
    });

    if (!data) {
      return null;
    }
    return Membership.restore(data);
  }

  async findByUserId(userId: string): Promise<Membership[]> {
    const data = await this.prisma.membership.findMany({
      where: { userId },
      include: {
        tenant: true,
      },
    });

    return data.map((item) => Membership.restore(item));
  }

  async findByTenantId(tenantId: string): Promise<Membership[]> {
    const data = await this.prisma.membership.findMany({
      where: { tenantId },
    });

    return data.map((item) => Membership.restore(item));
  }

  async findByTenantAndUser(tenantId: string, userId: string): Promise<Membership | null> {
    const data = await this.prisma.membership.findUnique({
      where: { tenantId_userId: { tenantId, userId } },
    });

    if (!data) {
      return null;
    }
    return Membership.restore(data);
  }

  async existsByTenantAndUser(tenantId: string, userId: string): Promise<boolean> {
    const count = await this.prisma.membership.count({
      where: { tenantId, userId },
    });

    return count > 0;
  }

  async existsByRole(tenantId: string, roleId: string): Promise<boolean> {
    const count = await this.prisma.membership.count({
      where: { tenantId, roleId },
    });

    return count > 0;
  }

  async update(membership: Membership): Promise<Membership> {
    const data = await this.prisma.membership.update({
      where: { id: membership.getId() },
      data: {
        roleId: membership.getRoleId(),
      },
    });

    return Membership.restore(data);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.membership.delete({
      where: { id },
    });
  }
}
