import { v4 as uuidv4 } from "@lukeed/uuid";
import type { OutboxCommand } from "@corely/offline-core";
import type { CreateCheckInEventInput, CreateLoyaltyEarnEntryInput } from "@corely/contracts";

export const EngagementCommandTypes = {
  CreateCheckIn: "engagement.checkin.create",
  CreateLoyaltyEarn: "engagement.loyalty.earn",
};

export const buildOutboxCommand = <TPayload>(
  workspaceId: string,
  type: string,
  payload: TPayload,
  idempotencyKey: string
): OutboxCommand<TPayload> => ({
  commandId: uuidv4(),
  workspaceId,
  type,
  payload,
  createdAt: new Date(),
  status: "PENDING",
  attempts: 0,
  idempotencyKey,
});

export const buildCreateCheckInCommand = (
  workspaceId: string,
  payload: CreateCheckInEventInput,
  idempotencyKey: string
) =>
  buildOutboxCommand<CreateCheckInEventInput>(
    workspaceId,
    EngagementCommandTypes.CreateCheckIn,
    payload,
    idempotencyKey
  );

export const buildCreateLoyaltyEarnCommand = (
  workspaceId: string,
  payload: CreateLoyaltyEarnEntryInput,
  idempotencyKey: string
) =>
  buildOutboxCommand<CreateLoyaltyEarnEntryInput>(
    workspaceId,
    EngagementCommandTypes.CreateLoyaltyEarn,
    payload,
    idempotencyKey
  );
