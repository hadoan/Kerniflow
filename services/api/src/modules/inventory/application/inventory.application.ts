import type {
  CreateProductUseCase,
  UpdateProductUseCase,
  ActivateProductUseCase,
  DeactivateProductUseCase,
  GetProductUseCase,
  ListProductsUseCase,
} from "./use-cases/products.usecases";
import type {
  CreateWarehouseUseCase,
  UpdateWarehouseUseCase,
  GetWarehouseUseCase,
  ListWarehousesUseCase,
} from "./use-cases/warehouses.usecases";
import type {
  CreateLocationUseCase,
  UpdateLocationUseCase,
  ListLocationsUseCase,
} from "./use-cases/locations.usecases";
import type {
  CreateInventoryDocumentUseCase,
  UpdateInventoryDocumentUseCase,
  ConfirmInventoryDocumentUseCase,
  PostInventoryDocumentUseCase,
  CancelInventoryDocumentUseCase,
  GetInventoryDocumentUseCase,
  ListInventoryDocumentsUseCase,
} from "./use-cases/documents.usecases";
import type {
  GetOnHandUseCase,
  GetAvailableUseCase,
  ListStockMovesUseCase,
  ListReservationsUseCase,
} from "./use-cases/stock.usecases";
import type {
  ListReorderPoliciesUseCase,
  CreateReorderPolicyUseCase,
  UpdateReorderPolicyUseCase,
  GetReorderSuggestionsUseCase,
  GetLowStockUseCase,
} from "./use-cases/reorder.usecases";

export class InventoryApplication {
  constructor(
    // Products
    public readonly createProduct: CreateProductUseCase,
    public readonly updateProduct: UpdateProductUseCase,
    public readonly activateProduct: ActivateProductUseCase,
    public readonly deactivateProduct: DeactivateProductUseCase,
    public readonly getProduct: GetProductUseCase,
    public readonly listProducts: ListProductsUseCase,
    // Warehouses
    public readonly createWarehouse: CreateWarehouseUseCase,
    public readonly updateWarehouse: UpdateWarehouseUseCase,
    public readonly getWarehouse: GetWarehouseUseCase,
    public readonly listWarehouses: ListWarehousesUseCase,
    // Locations
    public readonly createLocation: CreateLocationUseCase,
    public readonly updateLocation: UpdateLocationUseCase,
    public readonly listLocations: ListLocationsUseCase,
    // Documents
    public readonly createDocument: CreateInventoryDocumentUseCase,
    public readonly updateDocument: UpdateInventoryDocumentUseCase,
    public readonly confirmDocument: ConfirmInventoryDocumentUseCase,
    public readonly postDocument: PostInventoryDocumentUseCase,
    public readonly cancelDocument: CancelInventoryDocumentUseCase,
    public readonly getDocument: GetInventoryDocumentUseCase,
    public readonly listDocuments: ListInventoryDocumentsUseCase,
    // Stock
    public readonly getOnHand: GetOnHandUseCase,
    public readonly getAvailable: GetAvailableUseCase,
    public readonly listStockMoves: ListStockMovesUseCase,
    public readonly listReservations: ListReservationsUseCase,
    // Reorder
    public readonly listReorderPolicies: ListReorderPoliciesUseCase,
    public readonly createReorderPolicy: CreateReorderPolicyUseCase,
    public readonly updateReorderPolicy: UpdateReorderPolicyUseCase,
    public readonly getReorderSuggestions: GetReorderSuggestionsUseCase,
    public readonly getLowStock: GetLowStockUseCase
  ) {}
}
