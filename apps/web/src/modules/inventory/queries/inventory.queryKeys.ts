import type {
  ListProductsInput,
  ListInventoryDocumentsInput,
  ListStockMovesInput,
  GetOnHandInput,
  GetAvailableInput,
  ListReorderPoliciesInput,
  GetReorderSuggestionsInput,
} from "@corely/contracts";

export const inventoryQueryKeys = {
  all: ["inventory"] as const,

  products: {
    all: () => [...inventoryQueryKeys.all, "products"] as const,
    lists: () => [...inventoryQueryKeys.products.all(), "list"] as const,
    list: (query?: ListProductsInput) => [...inventoryQueryKeys.products.lists(), query] as const,
    details: () => [...inventoryQueryKeys.products.all(), "detail"] as const,
    detail: (productId: string) => [...inventoryQueryKeys.products.details(), productId] as const,
  },

  warehouses: {
    all: () => [...inventoryQueryKeys.all, "warehouses"] as const,
    list: () => [...inventoryQueryKeys.warehouses.all(), "list"] as const,
    detail: (warehouseId: string) => [...inventoryQueryKeys.warehouses.all(), warehouseId] as const,
    locations: (warehouseId: string) =>
      [...inventoryQueryKeys.warehouses.all(), warehouseId, "locations"] as const,
  },

  documents: {
    all: () => [...inventoryQueryKeys.all, "documents"] as const,
    lists: () => [...inventoryQueryKeys.documents.all(), "list"] as const,
    list: (query?: ListInventoryDocumentsInput) =>
      [...inventoryQueryKeys.documents.lists(), query] as const,
    detail: (documentId: string) => [...inventoryQueryKeys.documents.all(), documentId] as const,
  },

  stock: {
    onHand: (query?: GetOnHandInput) =>
      [...inventoryQueryKeys.all, "stock", "onHand", query] as const,
    available: (query?: GetAvailableInput) =>
      [...inventoryQueryKeys.all, "stock", "available", query] as const,
    moves: (query?: ListStockMovesInput) =>
      [...inventoryQueryKeys.all, "stock", "moves", query] as const,
  },

  reorder: {
    policies: (query?: ListReorderPoliciesInput) =>
      [...inventoryQueryKeys.all, "reorder", "policies", query] as const,
    suggestions: (query?: GetReorderSuggestionsInput) =>
      [...inventoryQueryKeys.all, "reorder", "suggestions", query] as const,
  },
};
