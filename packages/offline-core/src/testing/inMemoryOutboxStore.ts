import { type OutboxStore } from "../outbox/outboxStore.port";
import { type OutboxCommand, type OutboxError } from "../outbox/outboxTypes";

export class InMemoryOutboxStore implements OutboxStore {
  private readonly commands = new Map<string, OutboxCommand>();

  async enqueue(cmd: OutboxCommand): Promise<void> {
    this.commands.set(cmd.commandId, { ...cmd });
  }

  async listPending(workspaceId: string, limit: number): Promise<OutboxCommand[]> {
    const pending = Array.from(this.commands.values()).filter(
      (cmd) => cmd.workspaceId === workspaceId && cmd.status === "PENDING"
    );
    return pending.slice(0, limit).map((cmd) => ({ ...cmd }));
  }

  async getById(commandId: string): Promise<OutboxCommand | null> {
    const command = this.commands.get(commandId);
    return command ? { ...command } : null;
  }

  async markInFlight(commandId: string): Promise<void> {
    const command = this.commands.get(commandId);
    if (command) {
      this.commands.set(commandId, { ...command, status: "IN_FLIGHT" });
    }
  }

  async markSucceeded(commandId: string, meta?: unknown): Promise<void> {
    const command = this.commands.get(commandId);
    if (command) {
      const updated: OutboxCommand = {
        ...command,
        status: "SUCCEEDED",
        nextAttemptAt: null,
      };
      if (meta) {
        updated.meta = meta;
      }
      this.commands.set(commandId, updated);
    }
  }

  async markFailed(commandId: string, error: OutboxError): Promise<void> {
    const command = this.commands.get(commandId);
    if (command) {
      const updated: OutboxCommand = {
        ...command,
        status: "FAILED",
        nextAttemptAt: null,
        error,
      };
      this.commands.set(commandId, updated);
    }
  }

  async markConflict(commandId: string, info?: unknown): Promise<void> {
    const command = this.commands.get(commandId);
    if (command) {
      const updated: OutboxCommand = {
        ...command,
        status: "CONFLICT",
        nextAttemptAt: null,
        conflict: info,
      };
      this.commands.set(commandId, updated);
    }
  }

  async incrementAttempt(commandId: string, nextAttemptAt: Date): Promise<void> {
    const command = this.commands.get(commandId);
    if (command) {
      this.commands.set(commandId, {
        ...command,
        attempts: command.attempts + 1,
        status: "PENDING",
        nextAttemptAt,
      });
    }
  }

  async clearWorkspace(workspaceId: string): Promise<void> {
    for (const [id, command] of this.commands.entries()) {
      if (command.workspaceId === workspaceId) {
        this.commands.delete(id);
      }
    }
  }
}
