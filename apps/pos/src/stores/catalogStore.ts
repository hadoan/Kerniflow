import { create } from "zustand";
import type { CatalogProduct } from "@corely/contracts";
import { useAuthStore } from "./authStore";
import * as SecureStore from "expo-secure-store";

interface CatalogState {
  products: CatalogProduct[];
  lastSyncAt: Date | null;
  isLoading: boolean;
  isInitialized: boolean;
  syncError: string | null;

  initialize: () => Promise<void>;
  syncCatalog: (force?: boolean) => Promise<void>;
  searchProducts: (query: string) => Promise<CatalogProduct[]>;
  getProductById: (productId: string) => CatalogProduct | undefined;
  getProductBySku: (sku: string) => CatalogProduct | undefined;
  getProductByBarcode: (barcode: string) => CatalogProduct | undefined;
}

const CATALOG_STORAGE_KEY = "pos-catalog";
const CATALOG_SYNC_KEY = "pos-catalog-sync-at";

export const useCatalogStore = create<CatalogState>((set, get) => ({
  products: [],
  lastSyncAt: null,
  isLoading: false,
  isInitialized: false,
  syncError: null,

  initialize: async () => {
    if (get().isInitialized) {
      return;
    }

    try {
      // Load cached catalog from storage
      const cachedCatalog = await SecureStore.getItemAsync(CATALOG_STORAGE_KEY);
      const lastSyncStr = await SecureStore.getItemAsync(CATALOG_SYNC_KEY);

      if (cachedCatalog) {
        const products = JSON.parse(cachedCatalog);
        const lastSyncAt = lastSyncStr ? new Date(lastSyncStr) : null;
        set({ products, lastSyncAt, isInitialized: true });
        console.log(`Loaded ${products.length} products from cache`);
      } else {
        set({ isInitialized: true });
      }

      // Trigger background sync to refresh catalog
      get()
        .syncCatalog(false)
        .catch((error) => {
          console.error("Background catalog sync failed:", error);
        });
    } catch (error) {
      console.error("Failed to initialize catalog:", error);
      set({ isInitialized: true });
    }
  },

  syncCatalog: async (force = false) => {
    const apiClient = useAuthStore.getState().apiClient;
    if (!apiClient) {
      throw new Error("API client not initialized");
    }

    // Skip if already syncing
    if (get().isLoading) {
      console.log("Catalog sync already in progress");
      return;
    }

    set({ isLoading: true, syncError: null });
    try {
      const lastSyncAt = force ? null : get().lastSyncAt;

      const data = await apiClient.getCatalogSnapshot({
        lastSyncAt: lastSyncAt ?? undefined,
      });

      // Update state
      set({
        products: data.products,
        lastSyncAt: new Date(),
        isLoading: false,
        isInitialized: true,
      });

      // Cache to storage
      await SecureStore.setItemAsync(CATALOG_STORAGE_KEY, JSON.stringify(data.products));
      await SecureStore.setItemAsync(CATALOG_SYNC_KEY, new Date().toISOString());

      console.log(`Synced ${data.products.length} products from server`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      console.error("Failed to sync catalog:", error);
      set({ isLoading: false, syncError: errorMessage });
      throw error;
    }
  },

  searchProducts: async (query: string) => {
    const { products } = get();
    const lowerQuery = query.toLowerCase();

    // Search locally first
    const results = products.filter(
      (p) =>
        p.name.toLowerCase().includes(lowerQuery) ||
        p.sku?.toLowerCase().includes(lowerQuery) ||
        p.barcode?.toLowerCase().includes(lowerQuery)
    );

    return results;
  },

  getProductById: (productId: string) => {
    const { products } = get();
    return products.find((p) => p.productId === productId);
  },

  getProductBySku: (sku: string) => {
    const { products } = get();
    return products.find((p) => p.sku === sku);
  },

  getProductByBarcode: (barcode: string) => {
    const { products } = get();
    return products.find((p) => p.barcode === barcode);
  },
}));
