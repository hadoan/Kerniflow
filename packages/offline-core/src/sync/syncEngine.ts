import { type ConflictInfo } from "../conflicts/conflictTypes";
import { type OutboxStore } from "../outbox/outboxStore.port";
import { type OutboxCommand, type OutboxError } from "../outbox/outboxTypes";
import { type Clock } from "../platform/clock.port";
import { type IdGenerator } from "../platform/idGenerator.port";
import { type Logger } from "../platform/logger.port";
import { type NetworkMonitor } from "../platform/networkMonitor.port";
import { type SyncLock } from "./syncLock.port";
import { type SyncTransport } from "./syncTransport.port";
import {
  type BatchResult,
  type CommandResult,
  type FlushStats,
  type SyncEngineEvent,
  type SyncEventSubscriber,
} from "./syncTypes";
import { calculateBackoffDelay, type BackoffConfig } from "./backoff";

export interface SyncEngineOptions {
  flushIntervalMs?: number;
  batchSize?: number;
  backoff?: BackoffConfig;
}

export interface SyncEngineDeps {
  store: OutboxStore;
  transport: SyncTransport;
  lock: SyncLock;
  networkMonitor: NetworkMonitor;
  clock: Clock;
  idGenerator: IdGenerator;
  logger: Logger;
}

export class SyncEngine {
  private readonly store: OutboxStore;
  private readonly transport: SyncTransport;
  private readonly lock: SyncLock;
  private readonly networkMonitor: NetworkMonitor;
  private readonly clock: Clock;
  private readonly idGenerator: IdGenerator;
  private readonly logger: Logger;
  private readonly backoff: BackoffConfig;
  private readonly batchSize: number;
  private readonly flushIntervalMs: number;
  private readonly trackedWorkspaces = new Set<string>();
  private readonly subscribers = new Set<SyncEventSubscriber>();
  private intervalHandle: ReturnType<typeof setInterval> | null = null;
  private networkUnsubscribe: (() => void) | null = null;
  private running = false;

  constructor(deps: SyncEngineDeps, options: SyncEngineOptions = {}) {
    this.store = deps.store;
    this.transport = deps.transport;
    this.lock = deps.lock;
    this.networkMonitor = deps.networkMonitor;
    this.clock = deps.clock;
    this.idGenerator = deps.idGenerator;
    this.logger = deps.logger;
    this.backoff = options.backoff ?? {};
    this.batchSize = options.batchSize ?? 20;
    this.flushIntervalMs = options.flushIntervalMs ?? 30000;
  }

  trackWorkspace(workspaceId: string): void {
    this.trackedWorkspaces.add(workspaceId);
  }

  untrackWorkspace(workspaceId: string): void {
    this.trackedWorkspaces.delete(workspaceId);
  }

  subscribe(subscriber: SyncEventSubscriber): () => void {
    this.subscribers.add(subscriber);
    return () => this.subscribers.delete(subscriber);
  }

  start(): void {
    if (this.running) {
      return;
    }
    this.running = true;
    this.networkUnsubscribe = this.networkMonitor.subscribe((status) => {
      if (status === "ONLINE") {
        this.flushTracked().catch((err) => {
          this.logger.error("SyncEngine flush on reconnect failed", err);
        });
      }
    });
    this.networkMonitor
      .getCurrent()
      .then((status) => {
        if (status === "ONLINE") {
          return this.flushTracked();
        }
        return undefined;
      })
      .catch((err) => this.logger.error("SyncEngine initial flush failed", err));

    this.intervalHandle = setInterval(() => {
      this.flushTracked().catch((err) =>
        this.logger.error("SyncEngine interval flush failed", err)
      );
    }, this.flushIntervalMs);
  }

  stop(): void {
    this.running = false;
    if (this.intervalHandle !== null) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
    if (this.networkUnsubscribe) {
      this.networkUnsubscribe();
      this.networkUnsubscribe = null;
    }
  }

  async flush(workspaceId: string): Promise<FlushStats> {
    return this.flushWorkspace(workspaceId);
  }

  private async flushTracked(): Promise<void> {
    for (const workspaceId of this.trackedWorkspaces) {
      await this.flushWorkspace(workspaceId);
    }
  }

  private async flushWorkspace(workspaceId: string): Promise<FlushStats> {
    const stats: FlushStats = {
      processed: 0,
      succeeded: 0,
      failed: 0,
      conflicts: 0,
      retried: 0,
    };

    const acquired = await this.lock.acquire(workspaceId);
    if (!acquired) {
      this.logger.debug(`SyncEngine lock busy for workspace ${workspaceId}`);
      return stats;
    }

    this.emit({ type: "flushStarted", workspaceId });

    try {
      while (true) {
        const pending = await this.store.listPending(workspaceId, this.batchSize);
        const ready = pending.filter(
          (cmd) => !cmd.nextAttemptAt || cmd.nextAttemptAt <= this.clock.now()
        );

        if (!ready.length) {
          break;
        }

        for (const command of ready) {
          await this.store.markInFlight(command.commandId);
          this.emit({
            type: "statusChanged",
            workspaceId,
            commandId: command.commandId,
            status: "IN_FLIGHT",
          });
        }

        const results = await this.executeCommands(workspaceId, ready);
        for (const { command, result } of results) {
          stats.processed += 1;
          await this.handleResult(workspaceId, command, result, stats);
        }
      }
    } finally {
      await this.lock.release(workspaceId);
      this.emit({ type: "flushFinished", workspaceId, stats });
    }

    return stats;
  }

  private async executeCommands(
    workspaceId: string,
    commands: OutboxCommand[]
  ): Promise<Array<{ command: OutboxCommand; result: CommandResult }>> {
    if (this.transport.executeBatch) {
      const batch = await this.transport.executeBatch(workspaceId, commands);
      if (Array.isArray(batch)) {
        return batch.map((result, idx) => ({ command: commands[idx], result }));
      }
      return this.mapBatchResults(commands, batch);
    }

    const results: Array<{ command: OutboxCommand; result: CommandResult }> = [];
    for (const command of commands) {
      const result = await this.transport.executeCommand(command);
      results.push({ command, result });
    }
    return results;
  }

  private mapBatchResults(
    commands: OutboxCommand[],
    batch: BatchResult
  ): Array<{ command: OutboxCommand; result: CommandResult }> {
    const resultById = new Map(batch.results.map((r) => [r.commandId, r.result]));
    return commands.map((command) => ({
      command,
      result: resultById.get(command.commandId) ?? { status: "FATAL_ERROR" },
    }));
  }

  private async handleResult(
    workspaceId: string,
    command: OutboxCommand,
    result: CommandResult,
    stats: FlushStats
  ): Promise<void> {
    switch (result.status) {
      case "OK":
        await this.store.markSucceeded(command.commandId, { serverVersion: result.serverVersion });
        stats.succeeded += 1;
        this.emit({
          type: "statusChanged",
          workspaceId,
          commandId: command.commandId,
          status: "SUCCEEDED",
        });
        break;
      case "CONFLICT": {
        await this.store.markConflict(
          command.commandId,
          result.conflict as ConflictInfo | undefined
        );
        stats.conflicts += 1;
        this.emit({
          type: "conflictDetected",
          workspaceId,
          command,
          info: result.conflict,
        });
        break;
      }
      case "RETRYABLE_ERROR": {
        const nextDelay = calculateBackoffDelay(command.attempts, this.backoff);
        const nextAttemptAt = new Date(this.clock.now().getTime() + nextDelay);
        await this.store.incrementAttempt(command.commandId, nextAttemptAt);
        stats.retried += 1;
        this.emit({
          type: "statusChanged",
          workspaceId,
          commandId: command.commandId,
          status: "PENDING",
        });
        break;
      }
      case "FATAL_ERROR":
      default: {
        const error: OutboxError = {
          message: "Fatal error syncing command",
          code: "FATAL",
          retryable: false,
          meta: result.error,
        };
        await this.store.markFailed(command.commandId, error);
        stats.failed += 1;
        this.emit({
          type: "statusChanged",
          workspaceId,
          commandId: command.commandId,
          status: "FAILED",
        });
      }
    }

    this.emit({ type: "commandUpdated", workspaceId, command });
  }

  private emit(event: SyncEngineEvent): void {
    for (const subscriber of this.subscribers) {
      subscriber(event);
    }
  }
}
