import "reflect-metadata";
import { loadEnv } from "@corely/config";
import { NestFactory } from "@nestjs/core";
import { WorkerModule } from "./worker.module";
import { CONTRACTS_HELLO } from "@corely/contracts";
import { setupTracing, shutdownTracing } from "./observability/setup-tracing";
import { Logger } from "@nestjs/common";

// Load env files before anything else
loadEnv();

async function bootstrap() {
  const logger = new Logger("WorkerBootstrap");
  await setupTracing("corely-worker");

  await NestFactory.createApplicationContext(WorkerModule);

  logger.log("[worker] started");
  logger.log("[worker] " + CONTRACTS_HELLO);

  setInterval(() => {
    logger.log("[worker] tick " + new Date().toISOString());
  }, 10_000);
}

bootstrap().catch((err) => {
  const logger = new Logger("WorkerBootstrap");
  logger.error(err instanceof Error ? (err.stack ?? err.message) : String(err));
  void shutdownTracing();
  throw err;
});
