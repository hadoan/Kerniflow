import { Module } from "@nestjs/common";
import { KernelModule } from "../../shared/kernel/kernel.module";
import { PrivacyController } from "./adapters/http/privacy.controller";
import { RequestPersonalDataExportUseCase } from "./application/use-cases/request-personal-data-export/request-personal-data-export.usecase";
import { RequestAccountErasureUseCase } from "./application/use-cases/request-account-erasure/request-account-erasure.usecase";
import { GetPrivacyRequestStatusUseCase } from "./application/use-cases/get-privacy-request-status/get-privacy-request-status.usecase";
import { ProcessPrivacyRequestHandler } from "./application/workers/process-privacy-request.handler";
import { PrismaPrivacyRequestRepoAdapter } from "./infrastructure/prisma/prisma-privacy-request-repo.adapter";
import { OUTBOX_PORT } from "@corely/kernel";
import { ID_GENERATOR_TOKEN } from "../../shared/ports/id-generator.port";
import { CLOCK_PORT_TOKEN } from "../../shared/ports/clock.port";
import type { DocumentsPort } from "./application/ports/documents.port";
import type { PersonalDataCollectorPort } from "./application/ports/personal-data-collector.port";
import type { PersonalDataEraserPort } from "./application/ports/personal-data-eraser.port";
import type { IdentityPort } from "./application/ports/identity-port";

export const PERSONAL_DATA_COLLECTORS = "PERSONAL_DATA_COLLECTORS";
export const PERSONAL_DATA_ERASERS = "PERSONAL_DATA_ERASERS";
export const DOCUMENTS_PORT = "DOCUMENTS_PORT";
export const IDENTITY_PORT = "IDENTITY_PORT";

// Placeholder documents + identity adapters (to be implemented)
class NoopDocumentsPort implements DocumentsPort {
  async createPrivacyExport(): Promise<{ documentId: string }> {
    return { documentId: "doc-privacy-export" };
  }
  async createErasureReport(): Promise<{ documentId: string }> {
    return { documentId: "doc-privacy-report" };
  }
}
class NoopIdentityPort implements IdentityPort {}

@Module({
  imports: [KernelModule],
  controllers: [PrivacyController],
  providers: [
    PrismaPrivacyRequestRepoAdapter,
    { provide: DOCUMENTS_PORT, useClass: NoopDocumentsPort },
    { provide: IDENTITY_PORT, useClass: NoopIdentityPort },
    { provide: PERSONAL_DATA_COLLECTORS, useValue: [] },
    { provide: PERSONAL_DATA_ERASERS, useValue: [] },
    {
      provide: RequestPersonalDataExportUseCase,
      useFactory: (repo: PrismaPrivacyRequestRepoAdapter, outbox: any, idGen: any, clock: any) =>
        new RequestPersonalDataExportUseCase(repo, outbox, idGen, clock),
      inject: [PrismaPrivacyRequestRepoAdapter, OUTBOX_PORT, ID_GENERATOR_TOKEN, CLOCK_PORT_TOKEN],
    },
    {
      provide: RequestAccountErasureUseCase,
      useFactory: (
        repo: PrismaPrivacyRequestRepoAdapter,
        outbox: any,
        idGen: any,
        clock: any,
        identity: IdentityPort
      ) => new RequestAccountErasureUseCase(repo, outbox, idGen, clock, identity),
      inject: [
        PrismaPrivacyRequestRepoAdapter,
        OUTBOX_PORT,
        ID_GENERATOR_TOKEN,
        CLOCK_PORT_TOKEN,
        IDENTITY_PORT,
      ],
    },
    {
      provide: GetPrivacyRequestStatusUseCase,
      useFactory: (repo: PrismaPrivacyRequestRepoAdapter) =>
        new GetPrivacyRequestStatusUseCase(repo),
      inject: [PrismaPrivacyRequestRepoAdapter],
    },
    {
      provide: ProcessPrivacyRequestHandler,
      useFactory: (
        repo: PrismaPrivacyRequestRepoAdapter,
        clock: any,
        docs: DocumentsPort,
        collectors: PersonalDataCollectorPort[],
        erasers: PersonalDataEraserPort[]
      ) => new ProcessPrivacyRequestHandler(repo, clock, docs, collectors, erasers),
      inject: [
        PrismaPrivacyRequestRepoAdapter,
        CLOCK_PORT_TOKEN,
        DOCUMENTS_PORT,
        PERSONAL_DATA_COLLECTORS,
        PERSONAL_DATA_ERASERS,
      ],
    },
  ],
  exports: [
    RequestPersonalDataExportUseCase,
    RequestAccountErasureUseCase,
    GetPrivacyRequestStatusUseCase,
    PERSONAL_DATA_COLLECTORS,
    PERSONAL_DATA_ERASERS,
    DOCUMENTS_PORT,
    IDENTITY_PORT,
  ],
})
export class PrivacyModule {}
