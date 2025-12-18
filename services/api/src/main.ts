import "./load-env";
import "reflect-metadata";
import { Logger } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap() {
  const logger = new Logger("Bootstrap");
  const startedAt = Date.now();

  logger.log("Starting Nest factory");
  const app = await NestFactory.create(AppModule, {
    logger: ["log", "error", "warn", "debug", "verbose"],
  });
  logger.log(
    `Nest application created in ${Date.now() - startedAt}ms; configuring CORS and Swagger`
  );

  app.enableCors({ origin: true });

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle("Kerniflow API")
    .setDescription("Kerniflow - AI-native workflows → ERP kernel")
    .setVersion("1.0")
    .addBearerAuth()
    .build();

  logger.log("Creating Swagger document");
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("docs", app, document);

  logger.log("Initializing Nest application");
  await app.init();

  logger.log("Starting HTTP server on port 3000");
  await app.listen(3000);

  logger.log("[api] listening on http://localhost:3000");
  logger.log("[api] swagger docs at http://localhost:3000/docs");
}

bootstrap().catch((err) => {
  const logger = new Logger("Bootstrap");
  logger.error("Bootstrap failed", err instanceof Error ? err.stack : `${err}`);
  process.exit(1);
});
