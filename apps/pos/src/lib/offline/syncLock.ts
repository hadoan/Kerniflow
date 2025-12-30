import type { SyncLock } from "@corely/offline-core";

export class InMemorySyncLock implements SyncLock {
  private readonly locks = new Set<string>();

  async acquire(workspaceId: string): Promise<boolean> {
    if (this.locks.has(workspaceId)) {
      return false;
    }
    this.locks.add(workspaceId);
    return true;
  }

  async release(workspaceId: string): Promise<void> {
    this.locks.delete(workspaceId);
  }
}
