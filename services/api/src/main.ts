import "reflect-metadata";
import { loadEnv } from "@corely/config";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";
import { ProblemDetailsExceptionFilter } from "./shared/exceptions/problem-details.filter.js";
import { setupTracing, shutdownTracing } from "./shared/observability/setup-tracing";

// Load env files before anything else
loadEnv();

async function bootstrap() {
  const logger = new Logger("Bootstrap");
  const startedAt = Date.now();

  await setupTracing("corely-api");

  logger.log("Starting Nest factory");
  const app = await NestFactory.create(AppModule, {
    logger: ["log", "error", "warn", "debug", "verbose"],
  });

  logger.log(
    `Nest application created in ${Date.now() - startedAt}ms; configuring CORS and Swagger`
  );

  // Register global exception filter (converts all errors to ProblemDetails)
  app.useGlobalFilters(new ProblemDetailsExceptionFilter());

  app.enableCors({ origin: true });

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle("Corely API")
    .setDescription("Corely - AI-native workflows → ERP kernel")
    .setVersion("1.0")
    .addBearerAuth()
    .build();

  logger.log("Creating Swagger document");
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("docs", app, document);

  logger.log("Initializing Nest application");
  await app.init();

  // Use process.env directly since env is already loaded
  const port = parseInt(process.env.API_PORT || "3000", 10);
  logger.log(`Starting HTTP server on port ${port}`);
  await app.listen(port, "0.0.0.0");

  logger.log(`[api] listening on http://localhost:${port}`);
  logger.log(`[api] swagger docs at http://localhost:${port}/docs`);
}

bootstrap().catch((err) => {
  const logger = new Logger("Bootstrap");
  logger.error("Bootstrap failed", err instanceof Error ? err.stack : `${err}`);
  void shutdownTracing();
  throw err;
});
