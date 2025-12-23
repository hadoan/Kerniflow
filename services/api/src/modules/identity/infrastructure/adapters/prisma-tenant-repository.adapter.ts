import { Injectable } from "@nestjs/common";
import { prisma } from "@kerniflow/data";
import { Tenant } from "../../domain/entities/tenant.entity";
import { ITenantRepository } from "../../application/ports/tenant.repo.port";

/**
 * Prisma Tenant Repository Implementation
 */
@Injectable()
export class PrismaTenantRepository implements ITenantRepository {
  async create(tenant: Tenant): Promise<Tenant> {
    const data = await prisma.tenant.create({
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
    const data = await prisma.tenant.findUnique({
      where: { id },
    });

    if (!data) return null;
    return Tenant.restore(data);
  }

  async findBySlug(slug: string): Promise<Tenant | null> {
    const data = await prisma.tenant.findUnique({
      where: { slug },
    });

    if (!data) return null;
    return Tenant.restore(data);
  }

  async slugExists(slug: string): Promise<boolean> {
    const count = await prisma.tenant.count({
      where: { slug },
    });

    return count > 0;
  }

  async update(tenant: Tenant): Promise<Tenant> {
    const data = await prisma.tenant.update({
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
