import type { ArchiveCustomerUseCase } from "./use-cases/archive-customer/archive-customer.usecase";
import type { CreateCustomerUseCase } from "./use-cases/create-customer/create-customer.usecase";
import type { GetCustomerByIdUseCase } from "./use-cases/get-customer-by-id/get-customer-by-id.usecase";
import type { ListCustomersUseCase } from "./use-cases/list-customers/list-customers.usecase";
import type { SearchCustomersUseCase } from "./use-cases/search-customers/search-customers.usecase";
import type { UnarchiveCustomerUseCase } from "./use-cases/unarchive-customer/unarchive-customer.usecase";
import type { UpdateCustomerUseCase } from "./use-cases/update-customer/update-customer.usecase";

export class PartyCrmApplication {
  constructor(
    public readonly createCustomer: CreateCustomerUseCase,
    public readonly updateCustomer: UpdateCustomerUseCase,
    public readonly archiveCustomer: ArchiveCustomerUseCase,
    public readonly unarchiveCustomer: UnarchiveCustomerUseCase,
    public readonly getCustomerById: GetCustomerByIdUseCase,
    public readonly listCustomers: ListCustomersUseCase,
    public readonly searchCustomers: SearchCustomersUseCase
  ) {}
}
