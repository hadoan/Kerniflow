import type {
  CheckInEvent,
  LoyaltyAccount,
  LoyaltyLedgerEntry,
  EngagementSettings,
} from "@kerniflow/contracts";
import type {
  LoyaltyAccountRecord,
  LoyaltyLedgerEntryRecord,
} from "../ports/loyalty-repository.port";
import type { EngagementSettingsRecord } from "../../domain/engagement.types";
import type { CheckInEventRecord as CheckInRecord } from "../ports/checkin-repository.port";

export const toCheckInEventDto = (record: CheckInRecord): CheckInEvent => ({
  tenantId: record.tenantId,
  checkInEventId: record.checkInEventId,
  customerPartyId: record.customerPartyId,
  registerId: record.registerId,
  kioskDeviceId: record.kioskDeviceId ?? null,
  checkedInAt: record.checkedInAt,
  checkedInByType: record.checkedInByType,
  checkedInByEmployeePartyId: record.checkedInByEmployeePartyId ?? null,
  status: record.status,
  visitReason: record.visitReason ?? null,
  assignedEmployeePartyId: record.assignedEmployeePartyId ?? null,
  tags: record.tags ?? [],
  posSaleId: record.posSaleId ?? null,
  notes: record.notes ?? null,
  createdAt: record.createdAt,
  updatedAt: record.updatedAt,
});

export const toLoyaltyAccountDto = (record: LoyaltyAccountRecord): LoyaltyAccount => ({
  tenantId: record.tenantId,
  loyaltyAccountId: record.loyaltyAccountId,
  customerPartyId: record.customerPartyId,
  status: record.status,
  currentPointsBalance: record.currentPointsBalance,
  createdAt: record.createdAt,
  updatedAt: record.updatedAt,
});

export const toLoyaltyLedgerEntryDto = (record: LoyaltyLedgerEntryRecord): LoyaltyLedgerEntry => ({
  tenantId: record.tenantId,
  entryId: record.entryId,
  customerPartyId: record.customerPartyId,
  entryType: record.entryType,
  pointsDelta: record.pointsDelta,
  reasonCode: record.reasonCode,
  sourceType: record.sourceType ?? null,
  sourceId: record.sourceId ?? null,
  createdAt: record.createdAt,
  createdByEmployeePartyId: record.createdByEmployeePartyId ?? null,
});

export const toEngagementSettingsDto = (record: EngagementSettingsRecord): EngagementSettings => ({
  tenantId: record.tenantId,
  checkInModeEnabled: record.checkInModeEnabled,
  checkInDuplicateWindowMinutes: record.checkInDuplicateWindowMinutes,
  loyaltyEnabled: record.loyaltyEnabled,
  pointsPerVisit: record.pointsPerVisit,
  rewardRules: record.rewardRules ?? [],
  aiEnabled: record.aiEnabled,
  kioskBranding: record.kioskBranding ?? null,
  createdAt: record.createdAt,
  updatedAt: record.updatedAt,
});
