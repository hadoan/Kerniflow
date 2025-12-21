import { CreateCustomerUseCase } from "./use-cases/create-customer/CreateCustomerUseCase";
import { UpdateCustomerUseCase } from "./use-cases/update-customer/UpdateCustomerUseCase";
import { ArchiveCustomerUseCase } from "./use-cases/archive-customer/ArchiveCustomerUseCase";
import { UnarchiveCustomerUseCase } from "./use-cases/unarchive-customer/UnarchiveCustomerUseCase";
import { GetCustomerByIdUseCase } from "./use-cases/get-customer-by-id/GetCustomerByIdUseCase";
import { ListCustomersUseCase } from "./use-cases/list-customers/ListCustomersUseCase";
import { SearchCustomersUseCase } from "./use-cases/search-customers/SearchCustomersUseCase";

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
