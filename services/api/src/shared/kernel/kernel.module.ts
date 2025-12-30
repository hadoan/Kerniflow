import { Module } from "@nestjs/common";
import { DataModule } from "@corely/data";
import { SystemIdGenerator } from "../infrastructure/system-id-generator";
import { SystemClock } from "../infrastructure/system-clock";
import { PrismaIdempotencyStorageAdapter } from "../infrastructure/persistence/prisma-idempotency-storage.adapter";
import { ID_GENERATOR_TOKEN } from "../ports/id-generator.port";
import { CLOCK_PORT_TOKEN } from "../ports/clock.port";
import { IDEMPOTENCY_STORAGE_PORT_TOKEN } from "../ports/idempotency-storage.port";

@Module({
  imports: [DataModule],
  providers: [
    SystemIdGenerator,
    { provide: ID_GENERATOR_TOKEN, useExisting: SystemIdGenerator },
    SystemClock,
    { provide: CLOCK_PORT_TOKEN, useExisting: SystemClock },
    PrismaIdempotencyStorageAdapter,
    { provide: IDEMPOTENCY_STORAGE_PORT_TOKEN, useExisting: PrismaIdempotencyStorageAdapter },
  ],
  exports: [
    ID_GENERATOR_TOKEN,
    CLOCK_PORT_TOKEN,
    IDEMPOTENCY_STORAGE_PORT_TOKEN,
    SystemIdGenerator,
    SystemClock,
    PrismaIdempotencyStorageAdapter,
  ],
})
export class KernelModule {}
