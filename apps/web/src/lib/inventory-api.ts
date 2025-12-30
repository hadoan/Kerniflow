import type {
  ListProductsInput,
  ListProductsOutput,
  CreateProductInput,
  CreateProductOutput,
  UpdateProductInput,
  UpdateProductOutput,
  GetProductOutput,
  ActivateProductOutput,
  DeactivateProductOutput,
  ListWarehousesInput,
  ListWarehousesOutput,
  CreateWarehouseInput,
  CreateWarehouseOutput,
  UpdateWarehouseInput,
  UpdateWarehouseOutput,
  GetWarehouseOutput,
  ListLocationsOutput,
  CreateLocationInput,
  CreateLocationOutput,
  UpdateLocationInput,
  UpdateLocationOutput,
  CreateInventoryDocumentInput,
  CreateInventoryDocumentOutput,
  UpdateInventoryDocumentInput,
  UpdateInventoryDocumentOutput,
  GetInventoryDocumentOutput,
  ListInventoryDocumentsInput,
  ListInventoryDocumentsOutput,
  ConfirmInventoryDocumentOutput,
  PostInventoryDocumentInput,
  PostInventoryDocumentOutput,
  CancelInventoryDocumentOutput,
  GetOnHandInput,
  GetOnHandOutput,
  GetAvailableInput,
  GetAvailableOutput,
  ListStockMovesInput,
  ListStockMovesOutput,
  ListReservationsInput,
  ListReservationsOutput,
  ListReorderPoliciesInput,
  ListReorderPoliciesOutput,
  CreateReorderPolicyInput,
  CreateReorderPolicyOutput,
  UpdateReorderPolicyInput,
  UpdateReorderPolicyOutput,
  GetReorderSuggestionsInput,
  GetReorderSuggestionsOutput,
  GetLowStockInput,
  GetLowStockOutput,
  ProductDto,
  WarehouseDto,
  LocationDto,
  InventoryDocumentDto,
  ReorderPolicyDto,
} from "@corely/contracts";
import { apiClient } from "./api-client";

export class InventoryApi {
  async listProducts(params?: ListProductsInput): Promise<ListProductsOutput> {
    const queryParams = new URLSearchParams();
    if (params?.search) {
      queryParams.append("search", params.search);
    }
    if (params?.type) {
      queryParams.append("type", params.type);
    }
    if (params?.isActive !== undefined) {
      queryParams.append("isActive", String(params.isActive));
    }
    if (params?.cursor) {
      queryParams.append("cursor", params.cursor);
    }
    if (params?.pageSize) {
      queryParams.append("pageSize", params.pageSize.toString());
    }
    const queryString = queryParams.toString();
    const endpoint = queryString ? `/inventory/products?${queryString}` : "/inventory/products";
    return apiClient.get<ListProductsOutput>(endpoint, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async createProduct(input: CreateProductInput): Promise<ProductDto> {
    const result = await apiClient.post<CreateProductOutput>("/inventory/products", input, {
      idempotencyKey: apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
    return result.product;
  }

  async updateProduct(productId: string, patch: Partial<UpdateProductInput>): Promise<ProductDto> {
    const result = await apiClient.patch<UpdateProductOutput>(
      `/inventory/products/${productId}`,
      patch,
      {
        correlationId: apiClient.generateCorrelationId(),
      }
    );
    return result.product;
  }

  async getProduct(productId: string): Promise<ProductDto> {
    const result = await apiClient.get<GetProductOutput>(`/inventory/products/${productId}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
    return result.product;
  }

  async activateProduct(productId: string): Promise<ProductDto> {
    const result = await apiClient.post<ActivateProductOutput>(
      `/inventory/products/${productId}/activate`,
      {},
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
    return result.product;
  }

  async deactivateProduct(productId: string): Promise<ProductDto> {
    const result = await apiClient.post<DeactivateProductOutput>(
      `/inventory/products/${productId}/deactivate`,
      {},
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
    return result.product;
  }

  async listWarehouses(params?: ListWarehousesInput): Promise<ListWarehousesOutput> {
    const queryParams = new URLSearchParams();
    if (params?.cursor) {
      queryParams.append("cursor", params.cursor);
    }
    if (params?.pageSize) {
      queryParams.append("pageSize", params.pageSize.toString());
    }
    const queryString = queryParams.toString();
    const endpoint = queryString ? `/inventory/warehouses?${queryString}` : "/inventory/warehouses";
    return apiClient.get<ListWarehousesOutput>(endpoint, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async createWarehouse(input: CreateWarehouseInput): Promise<WarehouseDto> {
    const result = await apiClient.post<CreateWarehouseOutput>("/inventory/warehouses", input, {
      idempotencyKey: apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
    return result.warehouse;
  }

  async updateWarehouse(
    warehouseId: string,
    patch: Partial<UpdateWarehouseInput>
  ): Promise<WarehouseDto> {
    const result = await apiClient.patch<UpdateWarehouseOutput>(
      `/inventory/warehouses/${warehouseId}`,
      patch,
      {
        correlationId: apiClient.generateCorrelationId(),
      }
    );
    return result.warehouse;
  }

  async getWarehouse(warehouseId: string): Promise<WarehouseDto> {
    const result = await apiClient.get<GetWarehouseOutput>(`/inventory/warehouses/${warehouseId}`, {
      correlationId: apiClient.generateCorrelationId(),
    });
    return result.warehouse;
  }

  async listLocations(warehouseId: string): Promise<ListLocationsOutput> {
    return apiClient.get<ListLocationsOutput>(`/inventory/warehouses/${warehouseId}/locations`, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async createLocation(input: CreateLocationInput): Promise<LocationDto> {
    const result = await apiClient.post<CreateLocationOutput>("/inventory/locations", input, {
      idempotencyKey: apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
    return result.location;
  }

  async updateLocation(
    locationId: string,
    patch: Partial<UpdateLocationInput>
  ): Promise<LocationDto> {
    const result = await apiClient.patch<UpdateLocationOutput>(
      `/inventory/locations/${locationId}`,
      patch,
      {
        correlationId: apiClient.generateCorrelationId(),
      }
    );
    return result.location;
  }

  async listDocuments(params?: ListInventoryDocumentsInput): Promise<ListInventoryDocumentsOutput> {
    const queryParams = new URLSearchParams();
    if (params?.type) {
      queryParams.append("type", params.type);
    }
    if (params?.status) {
      queryParams.append("status", params.status);
    }
    if (params?.partyId) {
      queryParams.append("partyId", params.partyId);
    }
    if (params?.fromDate) {
      queryParams.append("fromDate", params.fromDate);
    }
    if (params?.toDate) {
      queryParams.append("toDate", params.toDate);
    }
    if (params?.search) {
      queryParams.append("search", params.search);
    }
    if (params?.cursor) {
      queryParams.append("cursor", params.cursor);
    }
    if (params?.pageSize) {
      queryParams.append("pageSize", params.pageSize.toString());
    }
    const queryString = queryParams.toString();
    const endpoint = queryString ? `/inventory/documents?${queryString}` : "/inventory/documents";
    return apiClient.get<ListInventoryDocumentsOutput>(endpoint, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async createDocument(input: CreateInventoryDocumentInput): Promise<InventoryDocumentDto> {
    const result = await apiClient.post<CreateInventoryDocumentOutput>(
      "/inventory/documents",
      input,
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
    return result.document;
  }

  async updateDocument(
    documentId: string,
    patch: Partial<UpdateInventoryDocumentInput>
  ): Promise<InventoryDocumentDto> {
    const result = await apiClient.patch<UpdateInventoryDocumentOutput>(
      `/inventory/documents/${documentId}`,
      patch,
      {
        correlationId: apiClient.generateCorrelationId(),
      }
    );
    return result.document;
  }

  async getDocument(documentId: string): Promise<InventoryDocumentDto> {
    const result = await apiClient.get<GetInventoryDocumentOutput>(
      `/inventory/documents/${documentId}`,
      {
        correlationId: apiClient.generateCorrelationId(),
      }
    );
    return result.document;
  }

  async confirmDocument(documentId: string): Promise<InventoryDocumentDto> {
    const result = await apiClient.post<ConfirmInventoryDocumentOutput>(
      `/inventory/documents/${documentId}/confirm`,
      {},
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
    return result.document;
  }

  async postDocument(
    documentId: string,
    input?: Partial<PostInventoryDocumentInput>
  ): Promise<InventoryDocumentDto> {
    const result = await apiClient.post<PostInventoryDocumentOutput>(
      `/inventory/documents/${documentId}/post`,
      input ?? {},
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
    return result.document;
  }

  async cancelDocument(documentId: string): Promise<InventoryDocumentDto> {
    const result = await apiClient.post<CancelInventoryDocumentOutput>(
      `/inventory/documents/${documentId}/cancel`,
      {},
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
    return result.document;
  }

  async getOnHand(params?: GetOnHandInput): Promise<GetOnHandOutput> {
    const queryParams = new URLSearchParams();
    if (params?.productId) {
      queryParams.append("productId", params.productId);
    }
    if (params?.warehouseId) {
      queryParams.append("warehouseId", params.warehouseId);
    }
    if (params?.locationId) {
      queryParams.append("locationId", params.locationId);
    }
    const queryString = queryParams.toString();
    const endpoint = queryString
      ? `/inventory/stock/on-hand?${queryString}`
      : "/inventory/stock/on-hand";
    return apiClient.get<GetOnHandOutput>(endpoint, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async getAvailable(params?: GetAvailableInput): Promise<GetAvailableOutput> {
    const queryParams = new URLSearchParams();
    if (params?.productId) {
      queryParams.append("productId", params.productId);
    }
    if (params?.warehouseId) {
      queryParams.append("warehouseId", params.warehouseId);
    }
    if (params?.locationId) {
      queryParams.append("locationId", params.locationId);
    }
    const queryString = queryParams.toString();
    const endpoint = queryString
      ? `/inventory/stock/available?${queryString}`
      : "/inventory/stock/available";
    return apiClient.get<GetAvailableOutput>(endpoint, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async listStockMoves(params?: ListStockMovesInput): Promise<ListStockMovesOutput> {
    const queryParams = new URLSearchParams();
    if (params?.productId) {
      queryParams.append("productId", params.productId);
    }
    if (params?.warehouseId) {
      queryParams.append("warehouseId", params.warehouseId);
    }
    if (params?.fromDate) {
      queryParams.append("fromDate", params.fromDate);
    }
    if (params?.toDate) {
      queryParams.append("toDate", params.toDate);
    }
    if (params?.cursor) {
      queryParams.append("cursor", params.cursor);
    }
    if (params?.pageSize) {
      queryParams.append("pageSize", params.pageSize.toString());
    }
    const queryString = queryParams.toString();
    const endpoint = queryString
      ? `/inventory/stock/moves?${queryString}`
      : "/inventory/stock/moves";
    return apiClient.get<ListStockMovesOutput>(endpoint, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async listReservations(params?: ListReservationsInput): Promise<ListReservationsOutput> {
    const queryParams = new URLSearchParams();
    if (params?.productId) {
      queryParams.append("productId", params.productId);
    }
    if (params?.documentId) {
      queryParams.append("documentId", params.documentId);
    }
    if (params?.cursor) {
      queryParams.append("cursor", params.cursor);
    }
    if (params?.pageSize) {
      queryParams.append("pageSize", params.pageSize.toString());
    }
    const queryString = queryParams.toString();
    const endpoint = queryString
      ? `/inventory/stock/reservations?${queryString}`
      : "/inventory/stock/reservations";
    return apiClient.get<ListReservationsOutput>(endpoint, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async listReorderPolicies(params?: ListReorderPoliciesInput): Promise<ListReorderPoliciesOutput> {
    const queryParams = new URLSearchParams();
    if (params?.productId) {
      queryParams.append("productId", params.productId);
    }
    if (params?.warehouseId) {
      queryParams.append("warehouseId", params.warehouseId);
    }
    const queryString = queryParams.toString();
    const endpoint = queryString
      ? `/inventory/reorder-policies?${queryString}`
      : "/inventory/reorder-policies";
    return apiClient.get<ListReorderPoliciesOutput>(endpoint, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async createReorderPolicy(input: CreateReorderPolicyInput): Promise<ReorderPolicyDto> {
    const result = await apiClient.post<CreateReorderPolicyOutput>(
      "/inventory/reorder-policies",
      input,
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
    return result.policy;
  }

  async updateReorderPolicy(
    policyId: string,
    patch: Partial<UpdateReorderPolicyInput>
  ): Promise<ReorderPolicyDto> {
    const result = await apiClient.patch<UpdateReorderPolicyOutput>(
      `/inventory/reorder-policies/${policyId}`,
      patch,
      {
        correlationId: apiClient.generateCorrelationId(),
      }
    );
    return result.policy;
  }

  async getReorderSuggestions(
    params?: GetReorderSuggestionsInput
  ): Promise<GetReorderSuggestionsOutput> {
    const queryParams = new URLSearchParams();
    if (params?.warehouseId) {
      queryParams.append("warehouseId", params.warehouseId);
    }
    if (params?.asOf) {
      queryParams.append("asOf", params.asOf);
    }
    const queryString = queryParams.toString();
    const endpoint = queryString
      ? `/inventory/reorder/suggestions?${queryString}`
      : "/inventory/reorder/suggestions";
    return apiClient.get<GetReorderSuggestionsOutput>(endpoint, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async getLowStock(params?: GetLowStockInput): Promise<GetLowStockOutput> {
    const queryParams = new URLSearchParams();
    if (params?.warehouseId) {
      queryParams.append("warehouseId", params.warehouseId);
    }
    if (params?.thresholdMode) {
      queryParams.append("thresholdMode", params.thresholdMode);
    }
    const queryString = queryParams.toString();
    const endpoint = queryString ? `/inventory/low-stock?${queryString}` : "/inventory/low-stock";
    return apiClient.get<GetLowStockOutput>(endpoint, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }
}

export const inventoryApi = new InventoryApi();
