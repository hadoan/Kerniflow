export type CheckInStatus = "ACTIVE" | "COMPLETED" | "CANCELED";
export type CheckInByType = "SELF_SERVICE" | "EMPLOYEE";

export type LoyaltyAccountStatus = "ACTIVE" | "SUSPENDED";
export type LoyaltyEntryType = "EARN" | "REDEEM" | "ADJUST" | "EXPIRE";
export type LoyaltyReasonCode =
  | "VISIT_CHECKIN"
  | "MANUAL_ADJUSTMENT"
  | "REWARD_REDEMPTION"
  | "EXPIRATION";

export type EngagementSettingsRecord = {
  tenantId: string;
  checkInModeEnabled: boolean;
  checkInDuplicateWindowMinutes: number;
  loyaltyEnabled: boolean;
  pointsPerVisit: number;
  rewardRules: Array<{
    rewardId: string;
    label: string;
    pointsCost: number;
    rewardValueCents?: number | null;
    active?: boolean;
  }>;
  aiEnabled: boolean;
  kioskBranding?: {
    logoUrl?: string | null;
    welcomeMessage?: string | null;
  } | null;
  createdAt: Date;
  updatedAt: Date;
};
