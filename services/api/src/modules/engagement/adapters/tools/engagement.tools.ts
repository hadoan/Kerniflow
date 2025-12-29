import {
  type CustomerMatchCard,
  EngagementFindCustomerInputSchema,
  EngagementCheckInAssistantInputSchema,
  EngagementLoyaltyNextBestActionInputSchema,
  EngagementExplainLoyaltyInputSchema,
} from "@kerniflow/contracts";
import type { DomainToolPort } from "../../../ai-copilot/application/ports/domain-tool.port";
import { type PartyCrmApplication } from "../../../party-crm/application/party-crm.application";
import { type EngagementApplication } from "../../application/engagement.application";

const buildCtx = (tenantId: string, userId: string, toolCallId?: string, runId?: string) => ({
  tenantId,
  userId,
  correlationId: toolCallId ?? runId,
  requestId: toolCallId,
});

export const buildEngagementTools = (
  engagement: EngagementApplication,
  partyCrm: PartyCrmApplication
): DomainToolPort[] => [
  {
    name: "engagement_findCustomer",
    description: "Find a customer for kiosk check-in based on name/phone/email context.",
    kind: "server",
    inputSchema: EngagementFindCustomerInputSchema,
    execute: async ({ tenantId, userId, input, toolCallId, runId }) => {
      const parsed = EngagementFindCustomerInputSchema.safeParse(input);
      if (!parsed.success) {
        return { ok: false, code: "VALIDATION_ERROR", details: parsed.error.flatten() };
      }

      const result = await partyCrm.searchCustomers.execute(
        { q: parsed.data.searchText, pageSize: parsed.data.limit },
        buildCtx(tenantId, userId, toolCallId, runId)
      );
      if (!result.ok) {
        return { ok: false, code: result.error.code, message: result.error.message };
      }

      const matches = result.value.items.map((customer) => ({
        customerPartyId: customer.id,
        displayName: customer.displayName,
        phone: customer.phone ?? null,
        email: customer.email ?? null,
        confidence: 0.6,
      }));

      const card: CustomerMatchCard = {
        ok: true,
        matches,
        confidence: matches.length ? 0.6 : 0.1,
        rationale: matches.length
          ? "Matched customers from name/phone search."
          : "No close matches found.",
        provenance: {
          searchText: parsed.data.searchText,
          matchedFields: ["displayName", "phone", "email"],
        },
      };

      return card;
    },
  },
  {
    name: "engagement_checkInAssistant",
    description: "Assess duplicate risk and recommend check-in decision.",
    kind: "server",
    inputSchema: EngagementCheckInAssistantInputSchema,
    execute: async ({ tenantId, userId, input, toolCallId, runId }) => {
      const parsed = EngagementCheckInAssistantInputSchema.safeParse(input);
      if (!parsed.success) {
        return { ok: false, code: "VALIDATION_ERROR", details: parsed.error.flatten() };
      }

      const now = new Date();
      const from = new Date(now.getTime() - parsed.data.duplicateWindowMinutes * 60 * 1000);
      const checkins = await engagement.listCheckIns.execute(
        {
          customerPartyId: parsed.data.customerPartyId,
          from,
          pageSize: 5,
        },
        buildCtx(tenantId, userId, toolCallId, runId)
      );

      const recent = checkins.ok ? checkins.value.items : [];
      const hasRecent = recent.length > 0;

      return {
        ok: true,
        decision: hasRecent ? "ASK_CONFIRMATION" : "PROCEED",
        confidence: hasRecent ? 0.7 : 0.8,
        rationale: hasRecent
          ? "A recent check-in exists within the duplicate window."
          : "No recent check-ins detected.",
        suggestedAction: hasRecent ? "Confirm duplicate override" : "Proceed with check-in",
        recentCheckIns: recent.map((item) => ({
          checkInEventId: item.checkInEventId,
          checkedInAt: item.checkedInAt,
          status: item.status,
        })),
      };
    },
  },
  {
    name: "engagement_loyaltyNextBestAction",
    description: "Suggest the next best loyalty action after check-in.",
    kind: "server",
    inputSchema: EngagementLoyaltyNextBestActionInputSchema,
    execute: async ({ tenantId, userId, input, toolCallId, runId }) => {
      const parsed = EngagementLoyaltyNextBestActionInputSchema.safeParse(input);
      if (!parsed.success) {
        return { ok: false, code: "VALIDATION_ERROR", details: parsed.error.flatten() };
      }

      const settings = await engagement.getSettings.execute(
        {},
        buildCtx(tenantId, userId, toolCallId, runId)
      );
      const rewardRules = settings.ok ? (settings.value.settings.rewardRules ?? []) : [];
      const pointsBalance = parsed.data.pointsBalance ?? 0;

      const actions = [];
      if (rewardRules.some((rule) => rule.pointsCost <= pointsBalance)) {
        actions.push({ type: "OFFER_REWARD", label: "Offer reward redemption", note: null });
      }
      if (parsed.data.salesContext?.hasOpenTicket) {
        actions.push({
          type: "ATTACH_TO_SALE",
          label: "Attach customer to current sale",
          note: null,
        });
      }
      actions.push({ type: "ADD_NOTE", label: "Add a visit note for staff", note: null });

      return {
        ok: true,
        actions,
        confidence: actions.length ? 0.7 : 0.4,
        rationale: "Suggested actions based on loyalty balance and POS context.",
      };
    },
  },
  {
    name: "engagement_explainLoyalty",
    description: "Explain how the loyalty program works for this customer.",
    kind: "server",
    inputSchema: EngagementExplainLoyaltyInputSchema,
    execute: async ({ tenantId, userId, input, toolCallId, runId }) => {
      const parsed = EngagementExplainLoyaltyInputSchema.safeParse(input);
      if (!parsed.success) {
        return { ok: false, code: "VALIDATION_ERROR", details: parsed.error.flatten() };
      }

      const settings = await engagement.getSettings.execute(
        {},
        buildCtx(tenantId, userId, toolCallId, runId)
      );
      const pointsPerVisit = settings.ok ? settings.value.settings.pointsPerVisit : 0;
      const rewardRules = settings.ok ? (settings.value.settings.rewardRules ?? []) : [];

      return {
        ok: true,
        summary: `You earn ${pointsPerVisit} points per visit.`,
        howToEarn: [`Check in to earn ${pointsPerVisit} points per visit.`],
        rewardsAvailable: rewardRules.map((rule) => rule.label),
        confidence: 0.8,
        rationale: "Summary based on current engagement settings.",
      };
    },
  },
];
