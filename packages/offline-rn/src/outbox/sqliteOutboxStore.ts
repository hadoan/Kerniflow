import type {
  OutboxStore,
  OutboxCommand,
  OutboxCommandStatus,
  OutboxError,
} from "@corely/offline-core";

/**
 * SQLite Outbox Store for React Native
 * Requires expo-sqlite or react-native-sqlite-storage
 *
 * Note: This is an interface definition. The actual implementation
 * should use expo-sqlite in the RN app.
 */

// SQLite database interface (compatible with expo-sqlite)
export interface SQLiteDatabase {
  execAsync(query: string, params?: any[]): Promise<any>;
  getAllAsync<T>(query: string, params?: any[]): Promise<T[]>;
  getFirstAsync<T>(query: string, params?: any[]): Promise<T | null>;
  runAsync(query: string, params?: any[]): Promise<{ lastInsertRowId: number; changes: number }>;
}

export class SqliteOutboxStore implements OutboxStore {
  private db: SQLiteDatabase;

  constructor(db: SQLiteDatabase) {
    this.db = db;
  }

  /**
   * Initialize database schema
   */
  async initialize(): Promise<void> {
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS outbox_commands (
        commandId TEXT PRIMARY KEY,
        workspaceId TEXT NOT NULL,
        type TEXT NOT NULL,
        payload TEXT NOT NULL,
        createdAt TEXT NOT NULL,
        status TEXT NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        nextAttemptAt TEXT,
        idempotencyKey TEXT NOT NULL,
        clientTraceId TEXT,
        meta TEXT,
        errorMessage TEXT,
        errorCode TEXT,
        errorRetryable INTEGER,
        errorMeta TEXT,
        conflict TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_outbox_status
        ON outbox_commands(workspaceId, status, nextAttemptAt);

      CREATE INDEX IF NOT EXISTS idx_outbox_idempotency
        ON outbox_commands(workspaceId, idempotencyKey);
    `);
  }

  /**
   * Enqueue a command for sync
   */
  async enqueue(command: OutboxCommand): Promise<void> {
    await this.db.runAsync(
      `INSERT INTO outbox_commands (
        commandId, workspaceId, type, payload, createdAt, status,
        attempts, nextAttemptAt, idempotencyKey, clientTraceId, meta,
        errorMessage, errorCode, errorRetryable, errorMeta, conflict
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        command.commandId,
        command.workspaceId,
        command.type,
        JSON.stringify(command.payload),
        command.createdAt.toISOString(),
        command.status,
        command.attempts,
        command.nextAttemptAt?.toISOString() || null,
        command.idempotencyKey,
        command.clientTraceId || null,
        command.meta ? JSON.stringify(command.meta) : null,
        command.error?.message || null,
        command.error?.code || null,
        command.error?.retryable ? 1 : 0,
        command.error?.meta ? JSON.stringify(command.error.meta) : null,
        command.conflict ? JSON.stringify(command.conflict) : null,
      ]
    );
  }

  /**
   * Find pending commands ready for sync
   */
  async findPending(workspaceId: string, limit: number): Promise<OutboxCommand[]> {
    const now = new Date().toISOString();
    const rows = await this.db.getAllAsync<any>(
      `SELECT * FROM outbox_commands
       WHERE workspaceId = ?
         AND status = 'PENDING'
         AND (nextAttemptAt IS NULL OR nextAttemptAt <= ?)
       ORDER BY createdAt ASC
       LIMIT ?`,
      [workspaceId, now, limit]
    );

    return rows.map((row) => this.rowToCommand(row));
  }

  /**
   * List pending commands (compat with OutboxStore port)
   */
  async listPending(workspaceId: string, limit: number): Promise<OutboxCommand[]> {
    return this.findPending(workspaceId, limit);
  }

  /**
   * Update command status
   */
  async updateStatus(
    commandId: string,
    status: OutboxCommandStatus,
    error?: OutboxError
  ): Promise<void> {
    if (error) {
      await this.db.runAsync(
        `UPDATE outbox_commands
         SET status = ?, attempts = attempts + 1,
             errorMessage = ?, errorCode = ?, errorRetryable = ?, errorMeta = ?
         WHERE commandId = ?`,
        [
          status,
          error.message,
          error.code || null,
          error.retryable ? 1 : 0,
          error.meta ? JSON.stringify(error.meta) : null,
          commandId,
        ]
      );
    } else {
      await this.db.runAsync(
        `UPDATE outbox_commands
         SET status = ?
         WHERE commandId = ?`,
        [status, commandId]
      );
    }
  }

  /**
   * Mark command as in-flight
   */
  async markInFlight(commandId: string): Promise<void> {
    await this.updateStatus(commandId, "IN_FLIGHT");
  }

  /**
   * Mark command as succeeded
   */
  async markSucceeded(commandId: string, meta?: unknown): Promise<void> {
    await this.db.runAsync(
      `UPDATE outbox_commands
       SET status = ?, meta = ?
       WHERE commandId = ?`,
      ["SUCCEEDED", meta ? JSON.stringify(meta) : null, commandId]
    );
  }

  /**
   * Mark command as failed with error
   */
  async markFailed(commandId: string, error: OutboxError): Promise<void> {
    await this.db.runAsync(
      `UPDATE outbox_commands
       SET status = ?, attempts = attempts + 1,
           errorMessage = ?, errorCode = ?, errorRetryable = ?, errorMeta = ?
       WHERE commandId = ?`,
      [
        "FAILED",
        error.message,
        error.code || null,
        error.retryable ? 1 : 0,
        error.meta ? JSON.stringify(error.meta) : null,
        commandId,
      ]
    );
  }

  /**
   * Mark command as conflict
   */
  async markConflict(commandId: string, conflict: unknown): Promise<void> {
    await this.db.runAsync(
      `UPDATE outbox_commands
       SET status = ?, conflict = ?
       WHERE commandId = ?`,
      ["CONFLICT", JSON.stringify(conflict), commandId]
    );
  }

  /**
   * Get command by ID
   */
  async getById(commandId: string): Promise<OutboxCommand | null> {
    const row = await this.db.getFirstAsync<any>(
      `SELECT * FROM outbox_commands WHERE commandId = ?`,
      [commandId]
    );

    return row ? this.rowToCommand(row) : null;
  }

  /**
   * Get all commands for a workspace (for debugging/UI)
   */
  async findByWorkspace(
    workspaceId: string,
    status?: OutboxCommandStatus
  ): Promise<OutboxCommand[]> {
    let query = `SELECT * FROM outbox_commands WHERE workspaceId = ?`;
    const params: any[] = [workspaceId];

    if (status) {
      query += ` AND status = ?`;
      params.push(status);
    }

    query += ` ORDER BY createdAt DESC`;

    const rows = await this.db.getAllAsync<any>(query, params);
    return rows.map((row) => this.rowToCommand(row));
  }

  /**
   * Delete old succeeded commands (cleanup)
   */
  async deleteOldSucceeded(olderThanDays: number): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const result = await this.db.runAsync(
      `DELETE FROM outbox_commands
       WHERE status = 'SUCCEEDED' AND createdAt < ?`,
      [cutoffDate.toISOString()]
    );

    return result.changes;
  }

  /**
   * Reset command to pending (for retry)
   */
  async resetToPending(commandId: string): Promise<void> {
    await this.db.runAsync(
      `UPDATE outbox_commands
       SET status = 'PENDING', nextAttemptAt = NULL, errorMessage = NULL, errorCode = NULL
       WHERE commandId = ?`,
      [commandId]
    );
  }

  /**
   * Increment attempt counter and schedule next attempt
   */
  async incrementAttempt(commandId: string, nextAttemptAt: Date): Promise<void> {
    await this.db.runAsync(
      `UPDATE outbox_commands
       SET attempts = attempts + 1, nextAttemptAt = ?
       WHERE commandId = ?`,
      [nextAttemptAt.toISOString(), commandId]
    );
  }

  /**
   * Remove all commands for a workspace (used when clearing local data)
   */
  async clearWorkspace(workspaceId: string): Promise<void> {
    await this.db.runAsync(`DELETE FROM outbox_commands WHERE workspaceId = ?`, [workspaceId]);
  }

  /**
   * Helper: Convert database row to OutboxCommand
   */
  private rowToCommand(row: any): OutboxCommand {
    const error: OutboxError | undefined = row.errorMessage
      ? {
          message: row.errorMessage,
          code: row.errorCode || undefined,
          retryable: Boolean(row.errorRetryable),
          meta: row.errorMeta ? JSON.parse(row.errorMeta) : undefined,
        }
      : undefined;

    const command: OutboxCommand = {
      commandId: row.commandId,
      workspaceId: row.workspaceId,
      type: row.type,
      payload: JSON.parse(row.payload),
      createdAt: new Date(row.createdAt),
      status: row.status as OutboxCommandStatus,
      attempts: row.attempts,
      nextAttemptAt: row.nextAttemptAt ? new Date(row.nextAttemptAt) : null,
      idempotencyKey: row.idempotencyKey,
    };

    if (row.clientTraceId) {
      command.clientTraceId = row.clientTraceId;
    }

    if (row.meta) {
      command.meta = JSON.parse(row.meta);
    }

    if (error) {
      command.error = error;
    }

    if (row.conflict) {
      command.conflict = JSON.parse(row.conflict);
    }

    return command;
  }
}
