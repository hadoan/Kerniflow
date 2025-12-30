import { Module } from "@nestjs/common";
import { DataModule } from "@kerniflow/data";
import { IdentityModule } from "../identity";
import { CustomersHttpController } from "./adapters/http/customers.controller";
import { PrismaPartyRepoAdapter } from "./infrastructure/prisma/prisma-party-repo.adapter";
import { PrismaCustomerQueryAdapter } from "./infrastructure/prisma/prisma-customer-query.adapter";
import { KernelModule } from "../../shared/kernel/kernel.module";
import { CLOCK_PORT_TOKEN } from "../../shared/ports/clock.port";
import { ID_GENERATOR_TOKEN } from "../../shared/ports/id-generator.port";
import { PartyApplication } from "./application/party.application";
import { NestLoggerAdapter } from "../../shared/adapters/logger/nest-logger.adapter";
import { CUSTOMER_QUERY_PORT } from "./application/ports/customer-query.port";
import { ArchiveCustomerUseCase } from "./application/use-cases/archive-customer/archive-customer.usecase";
import { CreateCustomerUseCase } from "./application/use-cases/create-customer/create-customer.usecase";
import { GetCustomerByIdUseCase } from "./application/use-cases/get-customer-by-id/get-customer-by-id.usecase";
import { ListCustomersUseCase } from "./application/use-cases/list-customers/list-customers.usecase";
import { SearchCustomersUseCase } from "./application/use-cases/search-customers/search-customers.usecase";
import { UnarchiveCustomerUseCase } from "./application/use-cases/unarchive-customer/unarchive-customer.usecase";
import { UpdateCustomerUseCase } from "./application/use-cases/update-customer/update-customer.usecase";

@Module({
  imports: [DataModule, KernelModule, IdentityModule],
  controllers: [CustomersHttpController],
  providers: [
    PrismaPartyRepoAdapter,
    PrismaCustomerQueryAdapter,
    { provide: CUSTOMER_QUERY_PORT, useExisting: PrismaCustomerQueryAdapter },
    {
      provide: CreateCustomerUseCase,
      useFactory: (repo: PrismaPartyRepoAdapter, idGen: any, clock: any) =>
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
      useFactory: (repo: PrismaPartyRepoAdapter, idGen: any, clock: any) =>
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
      useFactory: (repo: PrismaPartyRepoAdapter, clock: any) =>
        new ArchiveCustomerUseCase({
          logger: new NestLoggerAdapter(),
          partyRepo: repo,
          clock,
        }),
      inject: [PrismaPartyRepoAdapter, CLOCK_PORT_TOKEN],
    },
    {
      provide: UnarchiveCustomerUseCase,
      useFactory: (repo: PrismaPartyRepoAdapter, clock: any) =>
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
      provide: PartyApplication,
      useFactory: (
        createCustomer: CreateCustomerUseCase,
        updateCustomer: UpdateCustomerUseCase,
        archiveCustomer: ArchiveCustomerUseCase,
        unarchiveCustomer: UnarchiveCustomerUseCase,
        getCustomerById: GetCustomerByIdUseCase,
        listCustomers: ListCustomersUseCase,
        searchCustomers: SearchCustomersUseCase
      ) =>
        new PartyApplication(
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
  exports: [PartyApplication, CUSTOMER_QUERY_PORT],
})
export class PartyModule {}
