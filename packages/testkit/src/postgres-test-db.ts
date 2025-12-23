import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { execa } from "execa";
import { PostgreSqlContainer, StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { fileURLToPath } from "url";
import path from "path";
import { PrismaService } from "@kerniflow/data";

let sharedContainer: StartedPostgreSqlContainer | null = null;

export class PostgresTestDb {
  private prisma: PrismaService | null = null;
  private connectionString: string | null = null;

  /**
   * Starts (or reuses) a Postgres testcontainer and connects Prisma to it.
   * Must be called before importing modules that read process.env.DATABASE_URL.
   */
  async up(): Promise<PrismaService> {
    if (!sharedContainer) {
      sharedContainer = await new PostgreSqlContainer("postgres:16-alpine")
        .withDatabase("kerniflow_test")
        .withUsername("kerniflow")
        .withPassword("kerniflow")
        .start();
    }

    this.connectionString = sharedContainer.getConnectionUri();
    process.env.DATABASE_URL = this.connectionString;
    process.env.NODE_ENV = process.env.NODE_ENV || "test";

    this.prisma = new PrismaService();
    await this.prisma.$connect();
    return this.prisma;
  }

  get url(): string {
    if (!this.connectionString) throw new Error("Test DB not started");
    return this.connectionString;
  }

  get client(): PrismaService {
    if (!this.prisma) throw new Error("Test DB not started");
    return this.prisma;
  }

  /**
   * Applies Prisma migrations to the test DB.
   * This uses the @kerniflow/data Prisma schema to keep DB shape accurate.
   */
  async migrate(): Promise<void> {
    if (!this.connectionString) throw new Error("Test DB not started");
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
      ["--filter", "@kerniflow/data", "exec", "prisma", "migrate", "deploy", "--schema", schemaDir],
      {
        env: { ...process.env, DATABASE_URL: this.connectionString },
        stdout: "inherit",
        stderr: "inherit",
      }
    );

    await execa(
      "pnpm",
      ["--filter", "@kerniflow/data", "exec", "prisma", "generate", "--schema", schemaDir],
      {
        env: { ...process.env, DATABASE_URL: this.connectionString },
        stdout: "inherit",
        stderr: "inherit",
      }
    );
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
    if (!tableNames.length) return;

    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE ${tableNames.join(", ")} RESTART IDENTITY CASCADE;`
    );
  }

  async down(): Promise<void> {
    if (this.prisma) {
      await this.prisma.$disconnect();
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

export async function stopSharedContainer(): Promise<void> {
  if (sharedContainer) {
    await sharedContainer.stop();
    sharedContainer = null;
  }
}
