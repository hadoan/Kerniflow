import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { WorkerModule } from "./worker.module";
import { CONTRACTS_HELLO } from "@kerniflow/contracts";

async function bootstrap() {
  await NestFactory.createApplicationContext(WorkerModule);

  // eslint-disable-next-line no-console
  console.log("[worker] started");
  // eslint-disable-next-line no-console
  console.log("[worker] " + CONTRACTS_HELLO);

  setInterval(() => {
    // eslint-disable-next-line no-console
    console.log("[worker] tick " + new Date().toISOString());
  }, 10_000);
}

bootstrap().catch((err) => {
  // eslint-disable-next-line no-console
  console.error(err);
  process.exit(1);
});
