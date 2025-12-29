import { type ConflictInfo } from "../conflicts/conflictTypes";
import { type OutboxCommand, type OutboxCommandStatus } from "../outbox/outboxTypes";

export type CommandResultStatus = "OK" | "CONFLICT" | "RETRYABLE_ERROR" | "FATAL_ERROR";

export interface CommandResult<TServerState = unknown> {
  status: CommandResultStatus;
  serverVersion?: number;
  error?: unknown;
  conflict?: ConflictInfo<TServerState>;
}

export interface BatchResult {
  results: Array<{ commandId: string; result: CommandResult }>;
}

export interface FlushStats {
  processed: number;
  succeeded: number;
  failed: number;
  conflicts: number;
  retried: number;
}

export type SyncEngineEvent =
  | { type: "flushStarted"; workspaceId: string }
  | { type: "flushFinished"; workspaceId: string; stats: FlushStats }
  | { type: "commandUpdated"; workspaceId: string; command: OutboxCommand }
  | { type: "conflictDetected"; workspaceId: string; command: OutboxCommand; info?: unknown }
  | { type: "statusChanged"; workspaceId: string; commandId: string; status: OutboxCommandStatus };

export type SyncEventSubscriber = (event: SyncEngineEvent) => void;
