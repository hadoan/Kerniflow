import { Module } from "@nestjs/common";
import { CustomersHttpController } from "./adapters/http/customers.controller";
import { PrismaPartyRepoAdapter } from "./infrastructure/prisma/prisma-party-repo.adapter";
import { PrismaCustomerQueryAdapter } from "./infrastructure/prisma/prisma-customer-query.adapter";
import { SystemIdGenerator } from "../../shared/infrastructure/system-id-generator";
import { SystemClock } from "../../shared/infrastructure/system-clock";
import { CLOCK_PORT_TOKEN } from "../../shared/ports/clock.port";
import { ID_GENERATOR_TOKEN } from "../../shared/ports/id-generator.port";
import { CreateCustomerUseCase } from "./application/use-cases/create-customer/CreateCustomerUseCase";
import { UpdateCustomerUseCase } from "./application/use-cases/update-customer/UpdateCustomerUseCase";
import { ArchiveCustomerUseCase } from "./application/use-cases/archive-customer/ArchiveCustomerUseCase";
import { UnarchiveCustomerUseCase } from "./application/use-cases/unarchive-customer/UnarchiveCustomerUseCase";
import { GetCustomerByIdUseCase } from "./application/use-cases/get-customer-by-id/GetCustomerByIdUseCase";
import { ListCustomersUseCase } from "./application/use-cases/list-customers/ListCustomersUseCase";
import { SearchCustomersUseCase } from "./application/use-cases/search-customers/SearchCustomersUseCase";
import { PartyCrmApplication } from "./application/party-crm.application";
import { NestLoggerAdapter } from "../../shared/adapters/logger/nest-logger.adapter";
import { CUSTOMER_QUERY_PORT } from "./application/ports/customer-query.port";
import { IdentityModule } from "../identity";

@Module({
  imports: [IdentityModule],
  controllers: [CustomersHttpController],
  providers: [
    PrismaPartyRepoAdapter,
    PrismaCustomerQueryAdapter,
    SystemIdGenerator,
    SystemClock,
    { provide: ID_GENERATOR_TOKEN, useExisting: SystemIdGenerator },
    { provide: CLOCK_PORT_TOKEN, useExisting: SystemClock },
    { provide: CUSTOMER_QUERY_PORT, useExisting: PrismaCustomerQueryAdapter },
    {
      provide: CreateCustomerUseCase,
      useFactory: (repo: PrismaPartyRepoAdapter, idGen: SystemIdGenerator, clock: SystemClock) =>
        new CreateCustomerUseCase({
          logger: new NestLoggerAdapter(),
          partyRepo: repo,
          idGenerator: idGen,
          clock,
        }),
      inject: [PrismaPartyRepoAdapter, ID_GENERATOR_TOKEN, CLOCK_PORT_TOKEN],
    },
    {
      provide: UpdateCustomerUseCase,
      useFactory: (repo: PrismaPartyRepoAdapter, idGen: SystemIdGenerator, clock: SystemClock) =>
        new UpdateCustomerUseCase({
          logger: new NestLoggerAdapter(),
          partyRepo: repo,
          idGenerator: idGen,
          clock,
        }),
      inject: [PrismaPartyRepoAdapter, ID_GENERATOR_TOKEN, CLOCK_PORT_TOKEN],
    },
    {
      provide: ArchiveCustomerUseCase,
      useFactory: (repo: PrismaPartyRepoAdapter, clock: SystemClock) =>
        new ArchiveCustomerUseCase({
          logger: new NestLoggerAdapter(),
          partyRepo: repo,
          clock,
        }),
      inject: [PrismaPartyRepoAdapter, CLOCK_PORT_TOKEN],
    },
    {
      provide: UnarchiveCustomerUseCase,
      useFactory: (repo: PrismaPartyRepoAdapter, clock: SystemClock) =>
        new UnarchiveCustomerUseCase({
          logger: new NestLoggerAdapter(),
          partyRepo: repo,
          clock,
        }),
      inject: [PrismaPartyRepoAdapter, CLOCK_PORT_TOKEN],
    },
    {
      provide: GetCustomerByIdUseCase,
      useFactory: (repo: PrismaPartyRepoAdapter) =>
        new GetCustomerByIdUseCase({ logger: new NestLoggerAdapter(), partyRepo: repo }),
      inject: [PrismaPartyRepoAdapter],
    },
    {
      provide: ListCustomersUseCase,
      useFactory: (repo: PrismaPartyRepoAdapter) =>
        new ListCustomersUseCase({ logger: new NestLoggerAdapter(), partyRepo: repo }),
      inject: [PrismaPartyRepoAdapter],
    },
    {
      provide: SearchCustomersUseCase,
      useFactory: (repo: PrismaPartyRepoAdapter) =>
        new SearchCustomersUseCase({ logger: new NestLoggerAdapter(), partyRepo: repo }),
      inject: [PrismaPartyRepoAdapter],
    },
    {
      provide: PartyCrmApplication,
      useFactory: (
        createCustomer: CreateCustomerUseCase,
        updateCustomer: UpdateCustomerUseCase,
        archiveCustomer: ArchiveCustomerUseCase,
        unarchiveCustomer: UnarchiveCustomerUseCase,
        getCustomerById: GetCustomerByIdUseCase,
        listCustomers: ListCustomersUseCase,
        searchCustomers: SearchCustomersUseCase
      ) =>
        new PartyCrmApplication(
          createCustomer,
          updateCustomer,
          archiveCustomer,
          unarchiveCustomer,
          getCustomerById,
          listCustomers,
          searchCustomers
        ),
      inject: [
        CreateCustomerUseCase,
        UpdateCustomerUseCase,
        ArchiveCustomerUseCase,
        UnarchiveCustomerUseCase,
        GetCustomerByIdUseCase,
        ListCustomersUseCase,
        SearchCustomersUseCase,
      ],
    },
  ],
  exports: [PartyCrmApplication, CUSTOMER_QUERY_PORT],
})
export class PartyCrmModule {}
