import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import type { Request } from "express";
import {
  ListProductsInputSchema,
  CreateProductInputSchema,
  UpdateProductInputSchema,
  GetProductInputSchema,
  ActivateProductInputSchema,
  DeactivateProductInputSchema,
  ListWarehousesInputSchema,
  CreateWarehouseInputSchema,
  UpdateWarehouseInputSchema,
  GetWarehouseInputSchema,
  ListLocationsInputSchema,
  CreateLocationInputSchema,
  UpdateLocationInputSchema,
  CreateInventoryDocumentInputSchema,
  UpdateInventoryDocumentInputSchema,
  GetInventoryDocumentInputSchema,
  ListInventoryDocumentsInputSchema,
  ConfirmInventoryDocumentInputSchema,
  PostInventoryDocumentInputSchema,
  CancelInventoryDocumentInputSchema,
  GetOnHandInputSchema,
  GetAvailableInputSchema,
  ListStockMovesInputSchema,
  ListReservationsInputSchema,
  ListReorderPoliciesInputSchema,
  CreateReorderPolicyInputSchema,
  UpdateReorderPolicyInputSchema,
  GetReorderSuggestionsInputSchema,
  GetLowStockInputSchema,
} from "@corely/contracts";
import { InventoryApplication } from "../../application/inventory.application";
import { buildUseCaseContext, mapResultToHttp } from "./http-mappers";
import { AuthGuard } from "../../../identity";
import { RbacGuard, RequirePermission } from "../../../identity/adapters/http/rbac.guard";
import { RequireWorkspaceCapability, WorkspaceCapabilityGuard } from "../../../platform";

@Controller("inventory")
@UseGuards(AuthGuard, RbacGuard, WorkspaceCapabilityGuard)
@RequireWorkspaceCapability("inventory.basic")
export class InventoryController {
  constructor(private readonly app: InventoryApplication) {}

  // ===== Products =====
  @Get("products")
  @RequirePermission("inventory.products.read")
  async listProducts(@Query() query: any, @Req() req: Request) {
    const input = ListProductsInputSchema.parse({
      search: query.search,
      type: query.type,
      isActive: query.isActive !== undefined ? query.isActive === "true" : undefined,
      cursor: query.cursor,
      pageSize: query.pageSize ? Number(query.pageSize) : undefined,
    });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.listProducts.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Post("products")
  @RequirePermission("inventory.products.manage")
  async createProduct(@Body() body: unknown, @Req() req: Request) {
    const input = CreateProductInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const result = await this.app.createProduct.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Get("products/:productId")
  @RequirePermission("inventory.products.read")
  async getProduct(@Param("productId") productId: string, @Req() req: Request) {
    const input = GetProductInputSchema.parse({ productId });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.getProduct.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Patch("products/:productId")
  @RequirePermission("inventory.products.manage")
  async updateProduct(
    @Param("productId") productId: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    const input = UpdateProductInputSchema.parse({ ...(body as object), productId });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.updateProduct.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Post("products/:productId/activate")
  @RequirePermission("inventory.products.manage")
  async activateProduct(@Param("productId") productId: string, @Req() req: Request) {
    const input = ActivateProductInputSchema.parse({ productId });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.activateProduct.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Post("products/:productId/deactivate")
  @RequirePermission("inventory.products.manage")
  async deactivateProduct(@Param("productId") productId: string, @Req() req: Request) {
    const input = DeactivateProductInputSchema.parse({ productId });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.deactivateProduct.execute(input, ctx);
    return mapResultToHttp(result);
  }

  // ===== Warehouses =====
  @Get("warehouses")
  @RequirePermission("inventory.warehouses.read")
  async listWarehouses(@Query() query: any, @Req() req: Request) {
    const input = ListWarehousesInputSchema.parse({
      cursor: query.cursor,
      pageSize: query.pageSize ? Number(query.pageSize) : undefined,
    });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.listWarehouses.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Post("warehouses")
  @RequirePermission("inventory.warehouses.manage")
  async createWarehouse(@Body() body: unknown, @Req() req: Request) {
    const input = CreateWarehouseInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const result = await this.app.createWarehouse.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Get("warehouses/:warehouseId")
  @RequirePermission("inventory.warehouses.read")
  async getWarehouse(@Param("warehouseId") warehouseId: string, @Req() req: Request) {
    const input = GetWarehouseInputSchema.parse({ warehouseId });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.getWarehouse.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Patch("warehouses/:warehouseId")
  @RequirePermission("inventory.warehouses.manage")
  async updateWarehouse(
    @Param("warehouseId") warehouseId: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    const input = UpdateWarehouseInputSchema.parse({ ...(body as object), warehouseId });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.updateWarehouse.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Get("warehouses/:warehouseId/locations")
  @RequirePermission("inventory.warehouses.read")
  async listLocations(@Param("warehouseId") warehouseId: string, @Req() req: Request) {
    const input = ListLocationsInputSchema.parse({ warehouseId });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.listLocations.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Post("locations")
  @RequirePermission("inventory.warehouses.manage")
  async createLocation(@Body() body: unknown, @Req() req: Request) {
    const input = CreateLocationInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const result = await this.app.createLocation.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Patch("locations/:locationId")
  @RequirePermission("inventory.warehouses.manage")
  async updateLocation(
    @Param("locationId") locationId: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    const input = UpdateLocationInputSchema.parse({ ...(body as object), locationId });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.updateLocation.execute(input, ctx);
    return mapResultToHttp(result);
  }

  // ===== Documents =====
  @Get("documents")
  @RequirePermission("inventory.documents.read")
  async listDocuments(@Query() query: any, @Req() req: Request) {
    const input = ListInventoryDocumentsInputSchema.parse({
      type: query.type,
      status: query.status,
      partyId: query.partyId,
      fromDate: query.fromDate,
      toDate: query.toDate,
      search: query.search,
      cursor: query.cursor,
      pageSize: query.pageSize ? Number(query.pageSize) : undefined,
    });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.listDocuments.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Post("documents")
  @RequirePermission("inventory.documents.manage")
  async createDocument(@Body() body: unknown, @Req() req: Request) {
    const input = CreateInventoryDocumentInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const result = await this.app.createDocument.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Get("documents/:documentId")
  @RequirePermission("inventory.documents.read")
  async getDocument(@Param("documentId") documentId: string, @Req() req: Request) {
    const input = GetInventoryDocumentInputSchema.parse({ documentId });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.getDocument.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Patch("documents/:documentId")
  @RequirePermission("inventory.documents.manage")
  async updateDocument(
    @Param("documentId") documentId: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    const input = UpdateInventoryDocumentInputSchema.parse({ ...(body as object), documentId });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.updateDocument.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Post("documents/:documentId/confirm")
  @RequirePermission("inventory.documents.manage")
  async confirmDocument(
    @Param("documentId") documentId: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    const input = ConfirmInventoryDocumentInputSchema.parse({ ...(body as object), documentId });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.confirmDocument.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Post("documents/:documentId/post")
  @RequirePermission("inventory.documents.post")
  async postDocument(
    @Param("documentId") documentId: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    const input = PostInventoryDocumentInputSchema.parse({ ...(body as object), documentId });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.postDocument.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Post("documents/:documentId/cancel")
  @RequirePermission("inventory.documents.manage")
  async cancelDocument(
    @Param("documentId") documentId: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    const input = CancelInventoryDocumentInputSchema.parse({ ...(body as object), documentId });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.cancelDocument.execute(input, ctx);
    return mapResultToHttp(result);
  }

  // ===== Stock Views =====
  @Get("stock/on-hand")
  @RequirePermission("inventory.documents.read")
  async getOnHand(@Query() query: any, @Req() req: Request) {
    const input = GetOnHandInputSchema.parse({
      productId: query.productId,
      warehouseId: query.warehouseId,
      locationId: query.locationId,
    });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.getOnHand.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Get("stock/available")
  @RequirePermission("inventory.documents.read")
  async getAvailable(@Query() query: any, @Req() req: Request) {
    const input = GetAvailableInputSchema.parse({
      productId: query.productId,
      warehouseId: query.warehouseId,
      locationId: query.locationId,
    });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.getAvailable.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Get("stock/moves")
  @RequirePermission("inventory.documents.read")
  async listStockMoves(@Query() query: any, @Req() req: Request) {
    const input = ListStockMovesInputSchema.parse({
      productId: query.productId,
      warehouseId: query.warehouseId,
      fromDate: query.fromDate,
      toDate: query.toDate,
      cursor: query.cursor,
      pageSize: query.pageSize ? Number(query.pageSize) : undefined,
    });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.listStockMoves.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Get("stock/reservations")
  @RequirePermission("inventory.documents.read")
  async listReservations(@Query() query: any, @Req() req: Request) {
    const input = ListReservationsInputSchema.parse({
      productId: query.productId,
      documentId: query.documentId,
      cursor: query.cursor,
      pageSize: query.pageSize ? Number(query.pageSize) : undefined,
    });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.listReservations.execute(input, ctx);
    return mapResultToHttp(result);
  }

  // ===== Reorder =====
  @Get("reorder-policies")
  @RequirePermission("inventory.reorder.manage")
  async listReorderPolicies(@Query() query: any, @Req() req: Request) {
    const input = ListReorderPoliciesInputSchema.parse({
      productId: query.productId,
      warehouseId: query.warehouseId,
    });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.listReorderPolicies.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Post("reorder-policies")
  @RequirePermission("inventory.reorder.manage")
  async createReorderPolicy(@Body() body: unknown, @Req() req: Request) {
    const input = CreateReorderPolicyInputSchema.parse(body);
    const ctx = buildUseCaseContext(req);
    const result = await this.app.createReorderPolicy.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Patch("reorder-policies/:policyId")
  @RequirePermission("inventory.reorder.manage")
  async updateReorderPolicy(
    @Param("policyId") policyId: string,
    @Body() body: unknown,
    @Req() req: Request
  ) {
    const input = UpdateReorderPolicyInputSchema.parse({
      ...(body as object),
      reorderPolicyId: policyId,
    });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.updateReorderPolicy.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Get("reorder/suggestions")
  @RequirePermission("inventory.reorder.manage")
  async getReorderSuggestions(@Query() query: any, @Req() req: Request) {
    const input = GetReorderSuggestionsInputSchema.parse({
      warehouseId: query.warehouseId,
      asOf: query.asOf,
    });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.getReorderSuggestions.execute(input, ctx);
    return mapResultToHttp(result);
  }

  @Get("low-stock")
  @RequirePermission("inventory.reorder.manage")
  async getLowStock(@Query() query: any, @Req() req: Request) {
    const input = GetLowStockInputSchema.parse({
      warehouseId: query.warehouseId,
      thresholdMode: query.thresholdMode,
    });
    const ctx = buildUseCaseContext(req);
    const result = await this.app.getLowStock.execute(input, ctx);
    return mapResultToHttp(result);
  }
}
