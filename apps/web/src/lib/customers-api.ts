import { apiClient } from "./api-client";
import type {
  CreateCustomerInput,
  CreateCustomerOutput,
  UpdateCustomerInput,
  UpdateCustomerOutput,
  CustomerDto,
} from "@kerniflow/contracts";

export const customersApi = {
  async createCustomer(input: CreateCustomerInput): Promise<CustomerDto> {
    const response = await apiClient.post<CreateCustomerOutput>("/customers", input);
    return response.customer;
  },

  async updateCustomer(id: string, patch: UpdateCustomerInput["patch"]): Promise<CustomerDto> {
    const response = await apiClient.patch<UpdateCustomerOutput>(`/customers/${id}`, patch);
    return response.customer;
  },

  async getCustomer(id: string): Promise<CustomerDto> {
    const response = await apiClient.get<{ customer: CustomerDto }>(`/customers/${id}`);
    return response.customer;
  },

  async listCustomers(params?: {
    cursor?: string;
    pageSize?: number;
    includeArchived?: boolean;
  }): Promise<{ customers: CustomerDto[]; nextCursor?: string }> {
    return apiClient.get("/customers", params);
  },

  async archiveCustomer(id: string): Promise<CustomerDto> {
    const response = await apiClient.post<{ customer: CustomerDto }>(`/customers/${id}/archive`);
    return response.customer;
  },

  async unarchiveCustomer(id: string): Promise<CustomerDto> {
    const response = await apiClient.post<{ customer: CustomerDto }>(`/customers/${id}/unarchive`);
    return response.customer;
  },
};
