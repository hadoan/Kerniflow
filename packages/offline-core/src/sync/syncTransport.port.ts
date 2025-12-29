import { type OutboxCommand } from "../outbox/outboxTypes";
import { type BatchResult, type CommandResult } from "./syncTypes";

export interface SyncTransport {
  executeCommand(command: OutboxCommand): Promise<CommandResult>;
  executeBatch?(
    workspaceId: string,
    commands: OutboxCommand[]
  ): Promise<BatchResult | CommandResult[]>;
}
