import { Module } from "@nestjs/common";
import { TaxController } from "./tax.controller";

// Use cases
import { GetTaxProfileUseCase } from "./application/use-cases/get-tax-profile.use-case";
import { UpsertTaxProfileUseCase } from "./application/use-cases/upsert-tax-profile.use-case";
import { ListTaxCodesUseCase } from "./application/use-cases/list-tax-codes.use-case";
import { CreateTaxCodeUseCase } from "./application/use-cases/create-tax-code.use-case";
import { CalculateTaxUseCase } from "./application/use-cases/calculate-tax.use-case";
import { LockTaxSnapshotUseCase } from "./application/use-cases/lock-tax-snapshot.use-case";

// Services
import { TaxEngineService } from "./application/services/tax-engine.service";
import { DEPackV1 } from "./application/services/jurisdictions/de-pack.v1";

// Repository ports
import {
  TaxProfileRepoPort,
  TaxCodeRepoPort,
  TaxRateRepoPort,
  TaxSnapshotRepoPort,
  VatReportRepoPort,
} from "./domain/ports";

// Repository adapters
import { PrismaTaxProfileRepoAdapter } from "./infrastructure/prisma/prisma-tax-profile-repo.adapter";
import { PrismaTaxCodeRepoAdapter } from "./infrastructure/prisma/prisma-tax-code-repo.adapter";
import { PrismaTaxRateRepoAdapter } from "./infrastructure/prisma/prisma-tax-rate-repo.adapter";
import { PrismaTaxSnapshotRepoAdapter } from "./infrastructure/prisma/prisma-tax-snapshot-repo.adapter";
import { PrismaVatReportRepoAdapter } from "./infrastructure/prisma/prisma-vat-report-repo.adapter";

@Module({
  controllers: [TaxController],
  providers: [
    // Use cases
    GetTaxProfileUseCase,
    UpsertTaxProfileUseCase,
    ListTaxCodesUseCase,
    CreateTaxCodeUseCase,
    CalculateTaxUseCase,
    LockTaxSnapshotUseCase,

    // Services
    TaxEngineService,
    DEPackV1,

    // Repository adapters bound to ports
    {
      provide: TaxProfileRepoPort,
      useClass: PrismaTaxProfileRepoAdapter,
    },
    {
      provide: TaxCodeRepoPort,
      useClass: PrismaTaxCodeRepoAdapter,
    },
    {
      provide: TaxRateRepoPort,
      useClass: PrismaTaxRateRepoAdapter,
    },
    {
      provide: TaxSnapshotRepoPort,
      useClass: PrismaTaxSnapshotRepoAdapter,
    },
    {
      provide: VatReportRepoPort,
      useClass: PrismaVatReportRepoAdapter,
    },
  ],
  exports: [
    // Export use cases so other modules can use them
    CalculateTaxUseCase,
    LockTaxSnapshotUseCase,
    TaxEngineService,
  ],
})
export class TaxModule {}
