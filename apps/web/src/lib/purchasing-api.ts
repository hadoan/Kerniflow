import type {
  CreatePurchaseOrderInput,
  CreatePurchaseOrderOutput,
  PurchaseOrderDto,
  UpdatePurchaseOrderInput,
  UpdatePurchaseOrderOutput,
  ApprovePurchaseOrderOutput,
  SendPurchaseOrderOutput,
  ReceivePurchaseOrderOutput,
  ClosePurchaseOrderOutput,
  CancelPurchaseOrderOutput,
  ListPurchaseOrdersInput,
  ListPurchaseOrdersOutput,
  CreateVendorBillInput,
  CreateVendorBillOutput,
  VendorBillDto,
  UpdateVendorBillInput,
  UpdateVendorBillOutput,
  ApproveVendorBillOutput,
  PostVendorBillOutput,
  VoidVendorBillOutput,
  ListVendorBillsInput,
  ListVendorBillsOutput,
  RecordBillPaymentInput,
  RecordBillPaymentOutput,
  ListBillPaymentsOutput,
  PurchasingSettingsDto,
  GetPurchasingSettingsOutput,
  UpdatePurchasingSettingsInput,
  UpdatePurchasingSettingsOutput,
  ListAccountMappingsOutput,
  UpsertAccountMappingInput,
  UpsertAccountMappingOutput,
  ListSuppliersInput,
  ListSuppliersOutput,
} from "@corely/contracts";
import { apiClient } from "./api-client";

export class PurchasingApi {
  async listSuppliers(params?: ListSuppliersInput): Promise<ListSuppliersOutput> {
    const queryParams = new URLSearchParams();
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
    const endpoint = queryString ? `/purchasing/suppliers?${queryString}` : "/purchasing/suppliers";
    return apiClient.get<ListSuppliersOutput>(endpoint, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async createPurchaseOrder(
    input: CreatePurchaseOrderInput,
    idempotencyKey?: string
  ): Promise<PurchaseOrderDto> {
    const result = await apiClient.post<CreatePurchaseOrderOutput>(
      "/purchasing/purchase-orders",
      input,
      {
        idempotencyKey: idempotencyKey || apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
    return result.purchaseOrder;
  }

  async updatePurchaseOrder(
    purchaseOrderId: string,
    patch: Partial<UpdatePurchaseOrderInput>
  ): Promise<PurchaseOrderDto> {
    const result = await apiClient.patch<UpdatePurchaseOrderOutput>(
      `/purchasing/purchase-orders/${purchaseOrderId}`,
      patch,
      {
        correlationId: apiClient.generateCorrelationId(),
      }
    );
    return result.purchaseOrder;
  }

  async approvePurchaseOrder(purchaseOrderId: string): Promise<PurchaseOrderDto> {
    const result = await apiClient.post<ApprovePurchaseOrderOutput>(
      `/purchasing/purchase-orders/${purchaseOrderId}/approve`,
      {},
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
    return result.purchaseOrder;
  }

  async sendPurchaseOrder(purchaseOrderId: string): Promise<PurchaseOrderDto> {
    const result = await apiClient.post<SendPurchaseOrderOutput>(
      `/purchasing/purchase-orders/${purchaseOrderId}/send`,
      {},
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
    return result.purchaseOrder;
  }

  async receivePurchaseOrder(purchaseOrderId: string): Promise<PurchaseOrderDto> {
    const result = await apiClient.post<ReceivePurchaseOrderOutput>(
      `/purchasing/purchase-orders/${purchaseOrderId}/receive`,
      {},
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
    return result.purchaseOrder;
  }

  async closePurchaseOrder(purchaseOrderId: string): Promise<PurchaseOrderDto> {
    const result = await apiClient.post<ClosePurchaseOrderOutput>(
      `/purchasing/purchase-orders/${purchaseOrderId}/close`,
      {},
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
    return result.purchaseOrder;
  }

  async cancelPurchaseOrder(purchaseOrderId: string): Promise<PurchaseOrderDto> {
    const result = await apiClient.post<CancelPurchaseOrderOutput>(
      `/purchasing/purchase-orders/${purchaseOrderId}/cancel`,
      {},
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
    return result.purchaseOrder;
  }

  async getPurchaseOrder(purchaseOrderId: string): Promise<PurchaseOrderDto> {
    const result = await apiClient.get<{ purchaseOrder: PurchaseOrderDto }>(
      `/purchasing/purchase-orders/${purchaseOrderId}`,
      {
        correlationId: apiClient.generateCorrelationId(),
      }
    );
    return result.purchaseOrder;
  }

  async listPurchaseOrders(params?: ListPurchaseOrdersInput): Promise<ListPurchaseOrdersOutput> {
    const queryParams = new URLSearchParams();
    if (params?.status) {
      queryParams.append("status", params.status);
    }
    if (params?.supplierPartyId) {
      queryParams.append("supplierPartyId", params.supplierPartyId);
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
    const endpoint = queryString
      ? `/purchasing/purchase-orders?${queryString}`
      : "/purchasing/purchase-orders";
    return apiClient.get<ListPurchaseOrdersOutput>(endpoint, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async createVendorBill(
    input: CreateVendorBillInput,
    idempotencyKey?: string
  ): Promise<VendorBillDto> {
    const result = await apiClient.post<CreateVendorBillOutput>("/purchasing/vendor-bills", input, {
      idempotencyKey: idempotencyKey || apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
    return result.vendorBill;
  }

  async updateVendorBill(
    vendorBillId: string,
    patch: Partial<UpdateVendorBillInput>
  ): Promise<VendorBillDto> {
    const result = await apiClient.patch<UpdateVendorBillOutput>(
      `/purchasing/vendor-bills/${vendorBillId}`,
      patch,
      {
        correlationId: apiClient.generateCorrelationId(),
      }
    );
    return result.vendorBill;
  }

  async approveVendorBill(vendorBillId: string): Promise<VendorBillDto> {
    const result = await apiClient.post<ApproveVendorBillOutput>(
      `/purchasing/vendor-bills/${vendorBillId}/approve`,
      {},
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
    return result.vendorBill;
  }

  async postVendorBill(vendorBillId: string): Promise<VendorBillDto> {
    const result = await apiClient.post<PostVendorBillOutput>(
      `/purchasing/vendor-bills/${vendorBillId}/post`,
      {},
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
    return result.vendorBill;
  }

  async voidVendorBill(vendorBillId: string): Promise<VendorBillDto> {
    const result = await apiClient.post<VoidVendorBillOutput>(
      `/purchasing/vendor-bills/${vendorBillId}/void`,
      {},
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
    return result.vendorBill;
  }

  async getVendorBill(vendorBillId: string): Promise<VendorBillDto> {
    const result = await apiClient.get<{ vendorBill: VendorBillDto }>(
      `/purchasing/vendor-bills/${vendorBillId}`,
      {
        correlationId: apiClient.generateCorrelationId(),
      }
    );
    return result.vendorBill;
  }

  async listVendorBills(params?: ListVendorBillsInput): Promise<ListVendorBillsOutput> {
    const queryParams = new URLSearchParams();
    if (params?.status) {
      queryParams.append("status", params.status);
    }
    if (params?.supplierPartyId) {
      queryParams.append("supplierPartyId", params.supplierPartyId);
    }
    if (params?.fromDate) {
      queryParams.append("fromDate", params.fromDate);
    }
    if (params?.toDate) {
      queryParams.append("toDate", params.toDate);
    }
    if (params?.dueFromDate) {
      queryParams.append("dueFromDate", params.dueFromDate);
    }
    if (params?.dueToDate) {
      queryParams.append("dueToDate", params.dueToDate);
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
    const endpoint = queryString
      ? `/purchasing/vendor-bills?${queryString}`
      : "/purchasing/vendor-bills";
    return apiClient.get<ListVendorBillsOutput>(endpoint, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async recordBillPayment(input: RecordBillPaymentInput): Promise<VendorBillDto> {
    const result = await apiClient.post<RecordBillPaymentOutput>(
      `/purchasing/vendor-bills/${input.vendorBillId}/payments`,
      input,
      {
        idempotencyKey: apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
    return result.vendorBill;
  }

  async listBillPayments(vendorBillId: string): Promise<ListBillPaymentsOutput> {
    return apiClient.get<ListBillPaymentsOutput>(
      `/purchasing/vendor-bills/${vendorBillId}/payments`,
      {
        correlationId: apiClient.generateCorrelationId(),
      }
    );
  }

  async getSettings(): Promise<PurchasingSettingsDto> {
    const result = await apiClient.get<GetPurchasingSettingsOutput>("/purchasing/settings", {
      correlationId: apiClient.generateCorrelationId(),
    });
    return result.settings;
  }

  async updateSettings(
    input: UpdatePurchasingSettingsInput,
    idempotencyKey?: string
  ): Promise<PurchasingSettingsDto> {
    const result = await apiClient.patch<UpdatePurchasingSettingsOutput>(
      "/purchasing/settings",
      input,
      {
        idempotencyKey: idempotencyKey || apiClient.generateIdempotencyKey(),
        correlationId: apiClient.generateCorrelationId(),
      }
    );
    return result.settings;
  }

  async listAccountMappings(supplierPartyId?: string): Promise<ListAccountMappingsOutput> {
    const queryParams = new URLSearchParams();
    if (supplierPartyId) {
      queryParams.append("supplierPartyId", supplierPartyId);
    }
    const queryString = queryParams.toString();
    const endpoint = queryString
      ? `/purchasing/account-mappings?${queryString}`
      : "/purchasing/account-mappings";
    return apiClient.get<ListAccountMappingsOutput>(endpoint, {
      correlationId: apiClient.generateCorrelationId(),
    });
  }

  async upsertAccountMapping(
    input: UpsertAccountMappingInput,
    idempotencyKey?: string
  ): Promise<UpsertAccountMappingOutput> {
    return apiClient.post<UpsertAccountMappingOutput>("/purchasing/account-mappings", input, {
      idempotencyKey: idempotencyKey || apiClient.generateIdempotencyKey(),
      correlationId: apiClient.generateCorrelationId(),
    });
  }
}

export const purchasingApi = new PurchasingApi();
