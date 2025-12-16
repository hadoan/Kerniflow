import { Module, Global } from "@nestjs/common";
import { TestHarnessController } from "./test-harness.controller";
import { TestHarnessService } from "./test-harness.service";
import { PrismaClient } from "@kerniflow/data";

@Global()
@Module({
  controllers: [TestHarnessController],
  providers: [
    {
      provide: "TEST_HARNESS_SERVICE",
      useFactory: () => {
        // Create a new Prisma client for test harness
        return new TestHarnessService(new PrismaClient());
      },
    },
  ],
  exports: ["TEST_HARNESS_SERVICE"],
})
export class TestHarnessModule {}
