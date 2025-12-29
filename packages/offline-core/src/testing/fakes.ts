import { type Clock } from "../platform/clock.port";
import { type IdGenerator } from "../platform/idGenerator.port";
import { type Logger } from "../platform/logger.port";
import { type NetworkMonitor, type NetworkStatus } from "../platform/networkMonitor.port";
import { type SyncLock } from "../sync/syncLock.port";

export class StaticClock implements Clock {
  private current: Date;

  constructor(startAt?: Date) {
    this.current = startAt ?? new Date();
  }

  now(): Date {
    return this.current;
  }

  advanceBy(ms: number): void {
    this.current = new Date(this.current.getTime() + ms);
  }
}

export class IncrementingIdGenerator implements IdGenerator {
  private counter = 0;

  newId(): string {
    this.counter += 1;
    return `cmd_${this.counter}`;
  }
}

export class InMemoryLock implements SyncLock {
  private readonly locked = new Set<string>();

  async acquire(workspaceId: string): Promise<boolean> {
    if (this.locked.has(workspaceId)) {
      return false;
    }
    this.locked.add(workspaceId);
    return true;
  }

  async release(workspaceId: string): Promise<void> {
    this.locked.delete(workspaceId);
  }
}

export class MemoryLogger implements Logger {
  debug(): void {}
  info(): void {}
  warn(): void {}
  error(): void {}
}

export class TestNetworkMonitor implements NetworkMonitor {
  private status: NetworkStatus = "ONLINE";
  private readonly subscribers = new Set<(status: NetworkStatus) => void>();

  constructor(initial: NetworkStatus = "ONLINE") {
    this.status = initial;
  }

  async getCurrent(): Promise<NetworkStatus> {
    return this.status;
  }

  subscribe(cb: (status: NetworkStatus) => void): () => void {
    this.subscribers.add(cb);
    return () => this.subscribers.delete(cb);
  }

  setStatus(status: NetworkStatus): void {
    this.status = status;
    for (const subscriber of this.subscribers) {
      subscriber(status);
    }
  }
}
