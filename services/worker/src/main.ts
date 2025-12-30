import "reflect-metadata";
import { loadEnv } from "@corely/config";
import { NestFactory } from "@nestjs/core";
import { WorkerModule } from "./worker.module";
import { CONTRACTS_HELLO } from "@corely/contracts";

// Load env files before anything else
loadEnv();

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(WorkerModule);

  console.log("[worker] started");

  console.log("[worker] " + CONTRACTS_HELLO);

  setInterval(() => {
    console.log("[worker] tick " + new Date().toISOString());
  }, 10_000);
}

bootstrap().catch((err) => {
  console.error(err);
  throw err;
});
