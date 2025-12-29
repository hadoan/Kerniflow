import type { SyncTransport, CommandResult, OutboxCommand } from "@kerniflow/offline-core";
import type { CreateCheckInEventInput, CreateLoyaltyEarnEntryInput } from "@kerniflow/contracts";
import { HttpError } from "@kerniflow/api-client";
import { EngagementCommandTypes } from "@/offline/engagementOutbox";
import type { PosApiClient } from "@/lib/pos-api-client";
import type { EngagementService } from "@/services/engagementService";

type TransportDeps = {
  apiClient: PosApiClient;
  engagementService?: EngagementService | null;
};

export class PosSyncTransport implements SyncTransport {
  constructor(private readonly deps: TransportDeps) {}

  async executeCommand(command: OutboxCommand): Promise<CommandResult> {
    try {
      switch (command.type) {
        case EngagementCommandTypes.CreateCheckIn: {
          const payload = command.payload as CreateCheckInEventInput;
          const result = await this.deps.apiClient.createCheckIn(payload, command.idempotencyKey);
          if (this.deps.engagementService) {
            await this.deps.engagementService.markCheckInSynced(
              payload.checkInEventId,
              result.pointsAwarded ?? null
            );
          }
          return { status: "OK" };
        }
        case EngagementCommandTypes.CreateLoyaltyEarn: {
          const payload = command.payload as CreateLoyaltyEarnEntryInput;
          await this.deps.apiClient.createLoyaltyEarn(payload, command.idempotencyKey);
          return { status: "OK" };
        }
        default:
          return { status: "FATAL_ERROR", error: "Unknown command type" };
      }
    } catch (error) {
      if (command.type === EngagementCommandTypes.CreateCheckIn && this.deps.engagementService) {
        const payload = command.payload as CreateCheckInEventInput;
        await this.deps.engagementService.markCheckInFailed(
          payload.checkInEventId,
          error instanceof Error ? error.message : "Sync failed"
        );
      }
      if (error instanceof HttpError) {
        if (error.status === 409) {
          return { status: "CONFLICT", conflict: error.body };
        }
        if (error.status && error.status >= 500) {
          return { status: "RETRYABLE_ERROR", error: error.body };
        }
        return { status: "FATAL_ERROR", error: error.body };
      }
      return { status: "RETRYABLE_ERROR", error: error instanceof Error ? error.message : error };
    }
  }
}
