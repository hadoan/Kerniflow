import { Injectable } from "@nestjs/common";
import { PrismaService } from "@kerniflow/data";
import { TenantTimeZonePort } from "@kerniflow/kernel";

@Injectable()
export class PrismaTenantTimeZoneAdapter implements TenantTimeZonePort {
  constructor(private readonly prisma: PrismaService) {}

  async getTenantTimeZone(tenantId: string): Promise<string | null> {
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { timeZone: true },
    });
    return tenant?.timeZone ?? null;
  }
}
