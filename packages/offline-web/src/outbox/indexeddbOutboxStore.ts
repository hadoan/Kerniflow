import {
  deserializeCommand,
  type OutboxStore,
  type OutboxCommand,
  type OutboxError,
  serializeCommand,
  type SerializedCommand,
} from "@corely/offline-core";
import { getDb, OUTBOX_STORE } from "../idb";

export class IndexedDbOutboxStore implements OutboxStore {
  async enqueue(cmd: OutboxCommand): Promise<void> {
    const db = await getDb();
    const serialized = serializeCommand(cmd);
    await db.put(OUTBOX_STORE, serialized);
  }

  async listPending(workspaceId: string, limit: number): Promise<OutboxCommand[]> {
    const db = await getDb();
    const index = db.transaction(OUTBOX_STORE, "readonly").store.index("workspace_status");
    const records = await index.getAll([workspaceId, "PENDING"], limit);
    return records.map(deserializeCommand);
  }

  async getById(commandId: string): Promise<OutboxCommand | null> {
    const db = await getDb();
    const record = await db.get(OUTBOX_STORE, commandId);
    return record ? deserializeCommand(record) : null;
  }

  async markInFlight(commandId: string): Promise<void> {
    await this.updateCommand(commandId, (cmd) => ({ ...cmd, status: "IN_FLIGHT" as const }));
  }

  async markSucceeded(commandId: string, meta?: unknown): Promise<void> {
    await this.updateCommand(commandId, (cmd) => {
      const updated: SerializedCommand = {
        ...cmd,
        status: "SUCCEEDED",
        nextAttemptAt: null,
      };
      if (meta) {
        (updated as Record<string, unknown>).meta = meta;
      }
      return updated;
    });
  }

  async markFailed(commandId: string, error: OutboxError): Promise<void> {
    await this.updateCommand(commandId, (cmd) => ({
      ...cmd,
      status: "FAILED",
      nextAttemptAt: null,
      error,
    }));
  }

  async markConflict(commandId: string, info?: unknown): Promise<void> {
    await this.updateCommand(commandId, (cmd) => ({
      ...cmd,
      status: "CONFLICT",
      nextAttemptAt: null,
      conflict: info,
    }));
  }

  async incrementAttempt(commandId: string, nextAttemptAt: Date): Promise<void> {
    await this.updateCommand(commandId, (cmd) => ({
      ...cmd,
      attempts: cmd.attempts + 1,
      status: "PENDING",
      nextAttemptAt: nextAttemptAt.toISOString(),
    }));
  }

  async clearWorkspace(workspaceId: string): Promise<void> {
    const db = await getDb();
    const tx = db.transaction(OUTBOX_STORE, "readwrite");
    const index = tx.store.index("workspace");
    let cursor = await index.openCursor(workspaceId);
    while (cursor) {
      await cursor.delete();
      cursor = await cursor.continue();
    }
    await tx.done;
  }

  private async updateCommand(
    commandId: string,
    updater: (cmd: SerializedCommand) => SerializedCommand
  ): Promise<void> {
    const db = await getDb();
    const tx = db.transaction(OUTBOX_STORE, "readwrite");
    const existing = await tx.store.get(commandId);
    if (!existing) {
      await tx.done;
      return;
    }
    const updated = updater(existing);
    await tx.store.put(updated);
    await tx.done;
  }
}
