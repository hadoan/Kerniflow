import { useState, useEffect } from "react";
import * as SQLite from "expo-sqlite";
import { SalesService } from "@/services/salesService";

let salesServiceInstance: SalesService | null = null;

export function useSalesService() {
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    void initializeSalesService();
  }, []);

  const initializeSalesService = async () => {
    if (salesServiceInstance) {
      setInitialized(true);
      return;
    }

    try {
      const db = await SQLite.openDatabaseAsync("corely-pos.db");
      salesServiceInstance = new SalesService(db as any);
      await salesServiceInstance.initialize();
      setInitialized(true);
    } catch (error) {
      console.error("Failed to initialize sales service:", error);
    }
  };

  return {
    salesService: salesServiceInstance,
    initialized,
  };
}
