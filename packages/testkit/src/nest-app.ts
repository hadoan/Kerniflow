import { INestApplication } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { AppModule } from "../../services/api/src/app.module";
import { PostgresTestDb } from "./postgres-test-db";

/**
 * Bootstraps the Nest API against a disposable Postgres database.
 */
export async function createApiTestApp(db: PostgresTestDb): Promise<INestApplication> {
  process.env.DATABASE_URL = db.url;
  process.env.NODE_ENV = "test";

  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication();
  await app.init();
  return app;
}

export async function seedDefaultTenant(app: INestApplication) {
  const harness = app.get("TEST_HARNESS_SERVICE", { strict: false }) as
    | {
        seedTestData: (params: { email: string; password: string; tenantName: string }) => any;
      }
    | undefined;

  if (!harness?.seedTestData) {
    throw new Error("TestHarnessModule not registered; ensure NODE_ENV=test when creating the app");
  }

  return harness.seedTestData({
    email: "owner@example.com",
    password: "Password123!",
    tenantName: "Test Tenant",
  });
}
