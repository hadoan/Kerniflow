import { type OutboxCommand, type OutboxError } from "./outboxTypes";

export interface OutboxStore {
  enqueue(cmd: OutboxCommand): Promise<void>;
  listPending(workspaceId: string, limit: number): Promise<OutboxCommand[]>;
  getById(commandId: string): Promise<OutboxCommand | null>;
  markInFlight(commandId: string): Promise<void>;
  markSucceeded(commandId: string, meta?: unknown): Promise<void>;
  markFailed(commandId: string, error: OutboxError): Promise<void>;
  markConflict(commandId: string, info?: unknown): Promise<void>;
  incrementAttempt(commandId: string, nextAttemptAt: Date): Promise<void>;
  clearWorkspace(workspaceId: string): Promise<void>;
}
