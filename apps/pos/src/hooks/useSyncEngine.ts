import { useState, useEffect, useRef } from "react";
import NetInfo from "@react-native-community/netinfo";
import * as SQLite from "expo-sqlite";
import { v4 as uuidv4 } from "@lukeed/uuid";
import { SyncEngine, type OutboxCommand, type SyncEngineEvent } from "@corely/offline-core";
import { SqliteOutboxStore, ReactNativeNetworkMonitor } from "@corely/offline-rn";
import { useAuthStore } from "@/stores/authStore";
import { InMemorySyncLock } from "@/lib/offline/syncLock";
import { PosSyncTransport } from "@/lib/offline/posSyncTransport";
import { useEngagementService } from "@/hooks/useEngagementService";

let syncEngineInstance: SyncEngine | null = null;
let outboxStoreInstance: SqliteOutboxStore | null = null;

export function useSyncEngine() {
  const [pendingCommands, setPendingCommands] = useState<OutboxCommand[]>([]);
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing">("idle");
  const [isOnline, setIsOnline] = useState(true);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true);
  const syncSubscriptionRef = useRef<(() => void) | null>(null);
  const { apiClient, user } = useAuthStore();
  const { engagementService } = useEngagementService();

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOnline(state.isConnected ?? false);
    });
    return () => unsubscribe();
  }, []);

  const initializeSync = async () => {
    if (!outboxStoreInstance) {
      const db = await SQLite.openDatabaseAsync("corely-pos.db");
      outboxStoreInstance = new SqliteOutboxStore(db as any);
      await outboxStoreInstance.initialize();
    }

    if (!syncEngineInstance && apiClient) {
      const lock = new InMemorySyncLock();
      const networkMonitor = new ReactNativeNetworkMonitor(NetInfo as any);
      const transport = new PosSyncTransport({
        apiClient,
        engagementService: engagementService ?? null,
      });
      syncEngineInstance = new SyncEngine(
        {
          store: outboxStoreInstance,
          transport,
          lock,
          networkMonitor,
          clock: { now: () => new Date() },
          idGenerator: { newId: () => uuidv4() },
          logger: {
            debug: (message, meta) => console.debug("[offline]", message, meta),
            info: (message, meta) => console.info("[offline]", message, meta),
            warn: (message, meta) => console.warn("[offline]", message, meta),
            error: (message, meta) => console.error("[offline]", message, meta),
          },
        },
        { flushIntervalMs: 30000, batchSize: 20 }
      );
      syncEngineInstance.start();
    }

    if (syncEngineInstance && user?.workspaceId) {
      syncEngineInstance.trackWorkspace(user.workspaceId);
    }

    if (syncEngineInstance && !syncSubscriptionRef.current) {
      syncSubscriptionRef.current = syncEngineInstance.subscribe((event: SyncEngineEvent) => {
        if (event.type === "statusChanged" || event.type === "commandUpdated") {
          void refreshPendingCommands();
        }
      });
    }

    await refreshPendingCommands();
  };

  const refreshPendingCommands = async () => {
    if (!outboxStoreInstance || !user) {
      return;
    }
    try {
      const commands = await outboxStoreInstance.findByWorkspace(user.workspaceId);
      setPendingCommands(commands);
    } catch (error) {
      console.error("Failed to refresh pending commands:", error);
    }
  };

  const triggerSync = async () => {
    if (!syncEngineInstance || !user) {
      return;
    }
    if (!isOnline && autoSyncEnabled) {
      return;
    }

    setSyncStatus("syncing");
    try {
      await syncEngineInstance.flush(user.workspaceId);
      await refreshPendingCommands();
    } catch (error) {
      console.error("Sync failed:", error);
    } finally {
      setSyncStatus("idle");
    }
  };

  const retryFailedCommand = async (commandId: string) => {
    if (!outboxStoreInstance) {
      return;
    }
    try {
      await outboxStoreInstance.resetToPending(commandId);
      await triggerSync();
    } catch (error) {
      console.error("Failed to retry command:", error);
    }
  };

  const toggleAutoSync = () => {
    setAutoSyncEnabled((prev) => !prev);
  };

  return {
    pendingCommands,
    syncStatus,
    isOnline,
    autoSyncEnabled,
    initializeSync,
    triggerSync,
    retryFailedCommand,
    toggleAutoSync,
  };
}
