import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import type { PersistedClient } from "@tanstack/query-persist-client-core";
import type { SerializedCommand } from "@corely/offline-core";

export interface OfflineWebDb extends DBSchema {
  outbox: {
    key: string;
    value: SerializedCommand;
    indexes: {
      workspace_status: [string, string];
      workspace: string;
    };
  };
  queryCache: {
    key: string;
    value: PersistedClient;
  };
}

export const DEFAULT_DB_NAME = "corely_offline";
export const OUTBOX_STORE = "outbox";
export const QUERY_CACHE_STORE = "queryCache";

let dbPromise: Promise<IDBPDatabase<OfflineWebDb>> | null = null;

export function getDb(dbName = DEFAULT_DB_NAME): Promise<IDBPDatabase<OfflineWebDb>> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("indexedDB is not available in this environment"));
  }

  if (!dbPromise) {
    dbPromise = openDB<OfflineWebDb>(dbName, 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(OUTBOX_STORE)) {
          const store = db.createObjectStore(OUTBOX_STORE, { keyPath: "commandId" });
          store.createIndex("workspace_status", ["workspaceId", "status"], { unique: false });
          store.createIndex("workspace", "workspaceId", { unique: false });
        }
        if (!db.objectStoreNames.contains(QUERY_CACHE_STORE)) {
          db.createObjectStore(QUERY_CACHE_STORE);
        }
      },
    });
  }

  return dbPromise;
}

// Test utility to drop the DB and reset cached connection
export async function resetDb(dbName = DEFAULT_DB_NAME): Promise<void> {
  if (dbPromise) {
    try {
      const db = await dbPromise;
      db.close();
    } catch {
      // ignore
    }
  }
  dbPromise = null;
  if (typeof indexedDB === "undefined") {
    return;
  }
  await new Promise<void>((resolve, reject) => {
    const req = indexedDB.deleteDatabase(dbName);
    req.onsuccess = () => resolve();
    req.onblocked = () => resolve();
    req.onerror = () => reject(req.error);
  });
}
