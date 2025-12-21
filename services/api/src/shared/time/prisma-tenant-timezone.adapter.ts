import { Injectable } from "@nestjs/common";
import { prisma } from "@kerniflow/data";
import { TenantTimeZonePort } from "@kerniflow/kernel";

@Injectable()
export class PrismaTenantTimeZoneAdapter implements TenantTimeZonePort {
  async getTenantTimeZone(tenantId: string): Promise<string | null> {
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { timeZone: true },
    });
    return tenant?.timeZone ?? null;
  }
}
