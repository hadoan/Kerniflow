import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import type { EngagementSettingsRepositoryPort } from "../../application/ports/engagement-settings-repository.port";
import type { EngagementSettingsRecord } from "../../domain/engagement.types";

@Injectable()
export class PrismaEngagementSettingsRepositoryAdapter implements EngagementSettingsRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async getByTenant(tenantId: string): Promise<EngagementSettingsRecord | null> {
    const record = await this.prisma.engagementSettings.findUnique({
      where: { tenantId },
    });

    if (!record) {
      return null;
    }

    return {
      tenantId: record.tenantId,
      checkInModeEnabled: record.checkInModeEnabled,
      checkInDuplicateWindowMinutes: record.checkInDuplicateWindowMinutes,
      loyaltyEnabled: record.loyaltyEnabled,
      pointsPerVisit: record.pointsPerVisit,
      rewardRules: record.rewardRulesJson ? JSON.parse(record.rewardRulesJson) : [],
      aiEnabled: record.aiEnabled,
      kioskBranding: record.kioskBrandingJson ? JSON.parse(record.kioskBrandingJson) : null,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  async upsert(settings: EngagementSettingsRecord): Promise<void> {
    await this.prisma.engagementSettings.upsert({
      where: { tenantId: settings.tenantId },
      update: {
        checkInModeEnabled: settings.checkInModeEnabled,
        checkInDuplicateWindowMinutes: settings.checkInDuplicateWindowMinutes,
        loyaltyEnabled: settings.loyaltyEnabled,
        pointsPerVisit: settings.pointsPerVisit,
        rewardRulesJson: JSON.stringify(settings.rewardRules ?? []),
        aiEnabled: settings.aiEnabled,
        kioskBrandingJson: settings.kioskBranding ? JSON.stringify(settings.kioskBranding) : null,
        updatedAt: settings.updatedAt,
      },
      create: {
        tenantId: settings.tenantId,
        checkInModeEnabled: settings.checkInModeEnabled,
        checkInDuplicateWindowMinutes: settings.checkInDuplicateWindowMinutes,
        loyaltyEnabled: settings.loyaltyEnabled,
        pointsPerVisit: settings.pointsPerVisit,
        rewardRulesJson: JSON.stringify(settings.rewardRules ?? []),
        aiEnabled: settings.aiEnabled,
        kioskBrandingJson: settings.kioskBranding ? JSON.stringify(settings.kioskBranding) : null,
        createdAt: settings.createdAt,
        updatedAt: settings.updatedAt,
      },
    });
  }
}
