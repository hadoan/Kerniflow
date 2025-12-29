import { useEffect, useState } from "react";
import * as SQLite from "expo-sqlite";
import { EngagementService } from "@/services/engagementService";

let engagementServiceInstance: EngagementService | null = null;

export function useEngagementService() {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    void initializeService();
  }, []);

  const initializeService = async () => {
    if (engagementServiceInstance) {
      setInitialized(true);
      return;
    }

    try {
      const db = await SQLite.openDatabaseAsync("kerniflow-pos.db");
      engagementServiceInstance = new EngagementService(db as any);
      await engagementServiceInstance.initialize();
      setInitialized(true);
    } catch (error) {
      console.error("Failed to initialize engagement service:", error);
    }
  };

  return {
    engagementService: engagementServiceInstance,
    initialized,
  };
}
