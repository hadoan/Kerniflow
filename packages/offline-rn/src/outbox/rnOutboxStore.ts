import { type OutboxCommand, type OutboxError, type OutboxStore } from "@corely/offline-core";

/**
 * Placeholder implementation meant to be replaced with a SQLite-backed store.
 * This keeps the RN adapter compiling while the POS client is not yet implemented.
 */
export class ReactNativeOutboxStore implements OutboxStore {
  async enqueue(_cmd: OutboxCommand): Promise<void> {
    throw new Error("ReactNativeOutboxStore is not implemented. Provide a SQLite adapter.");
  }

  async listPending(_workspaceId: string, _limit: number): Promise<OutboxCommand[]> {
    return [];
  }

  async getById(_commandId: string): Promise<OutboxCommand | null> {
    return null;
  }

  async markInFlight(_commandId: string): Promise<void> {
    throw new Error("ReactNativeOutboxStore is not implemented.");
  }

  async markSucceeded(_commandId: string, _meta?: unknown): Promise<void> {
    throw new Error("ReactNativeOutboxStore is not implemented.");
  }

  async markFailed(_commandId: string, _error: OutboxError): Promise<void> {
    throw new Error("ReactNativeOutboxStore is not implemented.");
  }

  async markConflict(_commandId: string, _info?: unknown): Promise<void> {
    throw new Error("ReactNativeOutboxStore is not implemented.");
  }

  async incrementAttempt(_commandId: string, _nextAttemptAt: Date): Promise<void> {
    throw new Error("ReactNativeOutboxStore is not implemented.");
  }

  async clearWorkspace(_workspaceId: string): Promise<void> {
    throw new Error("ReactNativeOutboxStore is not implemented.");
  }
}
