import { Injectable, Inject } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import { Tenant } from "../../domain/entities/tenant.entity";
import { TenantRepositoryPort } from "../../application/ports/tenant-repository.port";

/**
 * Prisma Tenant Repository Implementation
 */
@Injectable()
export class PrismaTenantRepository implements TenantRepositoryPort {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async create(tenant: Tenant): Promise<Tenant> {
    const data = await this.prisma.tenant.create({
      data: {
        id: tenant.getId(),
        name: tenant.getName(),
        slug: tenant.getSlug(),
        status: tenant.getStatus(),
        createdAt: tenant.getCreatedAt(),
      },
    });

    return Tenant.restore(data);
  }

  async findById(id: string): Promise<Tenant | null> {
    const data = await this.prisma.tenant.findUnique({
      where: { id },
    });

    if (!data) {
      return null;
    }
    return Tenant.restore(data);
  }

  async findBySlug(slug: string): Promise<Tenant | null> {
    const data = await this.prisma.tenant.findUnique({
      where: { slug },
    });

    if (!data) {
      return null;
    }
    return Tenant.restore(data);
  }

  async slugExists(slug: string): Promise<boolean> {
    const count = await this.prisma.tenant.count({
      where: { slug },
    });

    return count > 0;
  }

  async update(tenant: Tenant): Promise<Tenant> {
    const data = await this.prisma.tenant.update({
      where: { id: tenant.getId() },
      data: {
        name: tenant.getName(),
        slug: tenant.getSlug(),
        status: tenant.getStatus(),
      },
    });

    return Tenant.restore(data);
  }
}
