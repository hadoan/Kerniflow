import { execa } from "execa";
import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { PostgreSqlContainer } from "@testcontainers/postgresql";

import { fileURLToPath } from "url";
import path from "path";
import { PrismaService } from "@corely/data";

let sharedContainer: StartedPostgreSqlContainer | null = null;
let activeDbCount = 0;

export class PostgresTestDb {
  private prisma: PrismaService | null = null;
  private connectionString: string | null = null;
  private started = false;

  /**
   * Starts (or reuses) a Postgres testcontainer and connects Prisma to it.
   * Must be called before importing modules that read process.env.DATABASE_URL.
   */
  async up(): Promise<void> {
    if (this.started) {
      return;
    }

    if (!sharedContainer) {
      sharedContainer = await new PostgreSqlContainer("postgres:16-alpine")
        .withDatabase("corely_test")
        .withUsername("corely")
        .withPassword("corely")
        .start();
    }

    this.started = true;
    activeDbCount += 1;
    this.connectionString = sharedContainer.getConnectionUri();
    process.env.DATABASE_URL = this.connectionString;
    process.env.NODE_ENV = process.env.NODE_ENV || "test";

    // Note: Don't instantiate PrismaService yet - wait until after migrate() generates the client
  }

  /**
   * Ensures the Prisma client is initialized (called internally after migrate)
   */
  private async ensureClient(): Promise<PrismaService> {
    if (!this.prisma) {
      this.prisma = new PrismaService();
      await this.prisma.$connect();
    }
    return this.prisma;
  }

  get url(): string {
    if (!this.connectionString) {
      throw new Error("Test DB not started");
    }
    return this.connectionString;
  }

  get client(): PrismaService {
    if (!this.prisma) {
      throw new Error("Test DB not started");
    }
    return this.prisma;
  }

  /**
   * Applies Prisma migrations to the test DB.
   * This uses the @corely/data Prisma schema to keep DB shape accurate.
   */
  async migrate(): Promise<void> {
    if (!this.connectionString) {
      throw new Error("Test DB not started");
    }
    const schemaDir = path.resolve(
      path.dirname(fileURLToPath(import.meta.url)),
      "..",
      "..",
      "data",
      "prisma",
      "schema"
    );

    await execa(
      "pnpm",
      ["--filter", "@corely/data", "exec", "prisma", "migrate", "deploy", "--schema", schemaDir],
      {
        env: { ...process.env, DATABASE_URL: this.connectionString },
        stdout: "inherit",
        stderr: "inherit",
      }
    );

    await execa(
      "pnpm",
      ["--filter", "@corely/data", "exec", "prisma", "generate", "--schema", schemaDir],
      {
        env: { ...process.env, DATABASE_URL: this.connectionString },
        stdout: "inherit",
        stderr: "inherit",
      }
    );

    // Now that Prisma client is generated, create the PrismaService instance
    await this.ensureClient();
  }

  /**
   * Truncate all public tables except prisma migrations to isolate test cases.
   */
  async reset(): Promise<void> {
    const prisma = this.client;
    const tables = await prisma.$queryRaw<
      Array<{ tablename: string }>
    >`SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename NOT IN ('_prisma_migrations');`;

    const tableNames = tables.map((t) => `"${t.tablename}"`);
    if (!tableNames.length) {
      return;
    }

    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE ${tableNames.join(", ")} RESTART IDENTITY CASCADE;`
    );
  }

  async down(): Promise<void> {
    if (!this.started) {
      return;
    }

    this.started = false;
    if (this.prisma) {
      await this.prisma.$disconnect();
    }

    this.prisma = null;
    this.connectionString = null;
    if (activeDbCount > 0) {
      activeDbCount -= 1;
    }
  }
}

export async function createTestDb(): Promise<PostgresTestDb> {
  const db = new PostgresTestDb();
  await db.up();
  await db.migrate();
  await db.reset();
  return db;
}

export async function stopSharedContainer(force = false): Promise<void> {
  // In parallel test runs we defer shutdown to Testcontainers' process exit hook
  // to avoid terminating DB connections used by other suites. Allow an opt-in
  // force stop for manual cleanup when needed.
  if (!force) {
    return;
  }

  if (sharedContainer && activeDbCount === 0) {
    await sharedContainer.stop();
    sharedContainer = null;
  }
}
