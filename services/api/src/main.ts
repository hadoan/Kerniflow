import "./load-env";
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import { AppModule } from "./app.module";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: true });

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle("Kerniflow API")
    .setDescription("Kerniflow - AI-native workflows → ERP kernel")
    .setVersion("1.0")
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup("docs", app, document);

  await app.listen(3000);
   
  console.log("[api] listening on http://localhost:3000");
   
  console.log("[api] swagger docs at http://localhost:3000/docs");
}

bootstrap().catch((err) => {
   
  console.error(err);
  process.exit(1);
});
