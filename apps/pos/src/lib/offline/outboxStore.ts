import * as SQLite from "expo-sqlite";
import { SqliteOutboxStore } from "@kerniflow/offline-rn";

let outboxStoreInstance: SqliteOutboxStore | null = null;

export const getOutboxStore = async (): Promise<SqliteOutboxStore> => {
  if (outboxStoreInstance) {
    return outboxStoreInstance;
  }
  const db = await SQLite.openDatabaseAsync("kerniflow-pos.db");
  outboxStoreInstance = new SqliteOutboxStore(db as any);
  await outboxStoreInstance.initialize();
  return outboxStoreInstance;
};
