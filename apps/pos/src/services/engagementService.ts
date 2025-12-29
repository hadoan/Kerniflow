import type * as SQLite from "expo-sqlite";

export type CachedCustomer = {
  customerPartyId: string;
  displayName: string;
  phone?: string | null;
  email?: string | null;
  tags?: string[];
  updatedAt: Date;
};

export type LoyaltySummaryCache = {
  customerPartyId: string;
  pointsBalance: number;
  updatedAt: Date;
};

export type LocalCheckInRecord = {
  checkInEventId: string;
  customerPartyId: string;
  registerId: string;
  status: "ACTIVE" | "COMPLETED" | "CANCELED";
  checkedInAt: Date;
  visitReason?: string | null;
  assignedEmployeePartyId?: string | null;
  notes?: string | null;
  pointsAwarded?: number | null;
  syncStatus: "PENDING" | "SYNCED" | "FAILED";
  syncError?: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export class EngagementService {
  private db: SQLite.SQLiteDatabase;

  constructor(db: SQLite.SQLiteDatabase) {
    this.db = db;
  }

  async initialize(): Promise<void> {
    await this.db.execAsync(`
      CREATE TABLE IF NOT EXISTS engagement_customers_cache (
        customer_party_id TEXT PRIMARY KEY,
        display_name TEXT NOT NULL,
        phone TEXT,
        email TEXT,
        tags_json TEXT,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS engagement_loyalty_cache (
        customer_party_id TEXT PRIMARY KEY,
        points_balance INTEGER NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS engagement_checkins (
        checkin_event_id TEXT PRIMARY KEY,
        customer_party_id TEXT NOT NULL,
        register_id TEXT NOT NULL,
        status TEXT NOT NULL,
        checked_in_at TEXT NOT NULL,
        visit_reason TEXT,
        assigned_employee_party_id TEXT,
        notes TEXT,
        points_awarded INTEGER,
        sync_status TEXT NOT NULL,
        sync_error TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_engagement_checkins_checked_in_at
        ON engagement_checkins(checked_in_at);
      CREATE INDEX IF NOT EXISTS idx_engagement_checkins_sync_status
        ON engagement_checkins(sync_status);
    `);
  }

  async upsertCustomerCache(customer: CachedCustomer): Promise<void> {
    await this.db.runAsync(
      `INSERT INTO engagement_customers_cache (
        customer_party_id, display_name, phone, email, tags_json, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(customer_party_id) DO UPDATE SET
        display_name = excluded.display_name,
        phone = excluded.phone,
        email = excluded.email,
        tags_json = excluded.tags_json,
        updated_at = excluded.updated_at`,
      [
        customer.customerPartyId,
        customer.displayName,
        customer.phone ?? null,
        customer.email ?? null,
        customer.tags ? JSON.stringify(customer.tags) : null,
        customer.updatedAt.toISOString(),
      ]
    );
  }

  async getCustomerById(customerPartyId: string): Promise<CachedCustomer | null> {
    const row = await this.db.getFirstAsync<any>(
      `SELECT * FROM engagement_customers_cache WHERE customer_party_id = ?`,
      [customerPartyId]
    );
    return row ? this.mapCustomer(row) : null;
  }

  async searchCustomersByPhone(phone: string): Promise<CachedCustomer[]> {
    const rows = await this.db.getAllAsync<any>(
      `SELECT * FROM engagement_customers_cache WHERE phone LIKE ? ORDER BY display_name LIMIT 20`,
      [`%${phone}%`]
    );
    return rows.map((row) => this.mapCustomer(row));
  }

  async searchCustomersByName(name: string): Promise<CachedCustomer[]> {
    const rows = await this.db.getAllAsync<any>(
      `SELECT * FROM engagement_customers_cache WHERE display_name LIKE ? ORDER BY display_name LIMIT 20`,
      [`%${name}%`]
    );
    return rows.map((row) => this.mapCustomer(row));
  }

  async upsertLoyaltySummary(summary: LoyaltySummaryCache): Promise<void> {
    await this.db.runAsync(
      `INSERT INTO engagement_loyalty_cache (
        customer_party_id, points_balance, updated_at
      ) VALUES (?, ?, ?)
      ON CONFLICT(customer_party_id) DO UPDATE SET
        points_balance = excluded.points_balance,
        updated_at = excluded.updated_at`,
      [summary.customerPartyId, summary.pointsBalance, summary.updatedAt.toISOString()]
    );
  }

  async getLoyaltySummary(customerPartyId: string): Promise<LoyaltySummaryCache | null> {
    const row = await this.db.getFirstAsync<any>(
      `SELECT * FROM engagement_loyalty_cache WHERE customer_party_id = ?`,
      [customerPartyId]
    );
    if (!row) {
      return null;
    }
    return {
      customerPartyId: row.customer_party_id,
      pointsBalance: row.points_balance,
      updatedAt: new Date(row.updated_at),
    };
  }

  async addOrUpdateCheckIn(record: LocalCheckInRecord): Promise<void> {
    await this.db.runAsync(
      `INSERT INTO engagement_checkins (
        checkin_event_id, customer_party_id, register_id, status, checked_in_at,
        visit_reason, assigned_employee_party_id, notes, points_awarded,
        sync_status, sync_error, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(checkin_event_id) DO UPDATE SET
        status = excluded.status,
        checked_in_at = excluded.checked_in_at,
        visit_reason = excluded.visit_reason,
        assigned_employee_party_id = excluded.assigned_employee_party_id,
        notes = excluded.notes,
        points_awarded = excluded.points_awarded,
        sync_status = excluded.sync_status,
        sync_error = excluded.sync_error,
        updated_at = excluded.updated_at`,
      [
        record.checkInEventId,
        record.customerPartyId,
        record.registerId,
        record.status,
        record.checkedInAt.toISOString(),
        record.visitReason ?? null,
        record.assignedEmployeePartyId ?? null,
        record.notes ?? null,
        record.pointsAwarded ?? null,
        record.syncStatus,
        record.syncError ?? null,
        record.createdAt.toISOString(),
        record.updatedAt.toISOString(),
      ]
    );
  }

  async listTodayCheckIns(): Promise<LocalCheckInRecord[]> {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const rows = await this.db.getAllAsync<any>(
      `SELECT * FROM engagement_checkins
       WHERE checked_in_at >= ?
       ORDER BY checked_in_at DESC`,
      [start.toISOString()]
    );
    return rows.map((row) => this.mapCheckIn(row));
  }

  async markCheckInSynced(checkInEventId: string, pointsAwarded?: number | null): Promise<void> {
    await this.db.runAsync(
      `UPDATE engagement_checkins
       SET sync_status = 'SYNCED',
           points_awarded = ?,
           sync_error = NULL,
           updated_at = ?
       WHERE checkin_event_id = ?`,
      [pointsAwarded ?? null, new Date().toISOString(), checkInEventId]
    );
  }

  async markCheckInFailed(checkInEventId: string, errorMessage: string): Promise<void> {
    await this.db.runAsync(
      `UPDATE engagement_checkins
       SET sync_status = 'FAILED',
           sync_error = ?,
           updated_at = ?
       WHERE checkin_event_id = ?`,
      [errorMessage, new Date().toISOString(), checkInEventId]
    );
  }

  private mapCustomer(row: any): CachedCustomer {
    return {
      customerPartyId: row.customer_party_id,
      displayName: row.display_name,
      phone: row.phone ?? null,
      email: row.email ?? null,
      tags: row.tags_json ? JSON.parse(row.tags_json) : [],
      updatedAt: new Date(row.updated_at),
    };
  }

  private mapCheckIn(row: any): LocalCheckInRecord {
    return {
      checkInEventId: row.checkin_event_id,
      customerPartyId: row.customer_party_id,
      registerId: row.register_id,
      status: row.status,
      checkedInAt: new Date(row.checked_in_at),
      visitReason: row.visit_reason ?? null,
      assignedEmployeePartyId: row.assigned_employee_party_id ?? null,
      notes: row.notes ?? null,
      pointsAwarded: row.points_awarded ?? null,
      syncStatus: row.sync_status,
      syncError: row.sync_error ?? null,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    };
  }
}
