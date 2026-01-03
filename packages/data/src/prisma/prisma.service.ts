import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

/**
 * Singleton PrismaService managing the PrismaClient lifecycle.
 * This is the ONLY place where PrismaClient should be instantiated.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private pool: Pool | null;
  private readonly skipConnect: boolean;

  constructor() {
    const skipConnect = process.env.SKIP_PRISMA_CONNECT === "true";
    if (skipConnect) {
      super();
      this.skipConnect = true;
      this.pool = null;
      return;
    }

    const url = process.env.DATABASE_URL;
    if (!url) {
      throw new Error("DATABASE_URL must be set before accessing Prisma client");
    }

    const pool = new Pool({ connectionString: url });
    const adapter = new PrismaPg(pool);

    super({ adapter });
    this.pool = pool;
    this.skipConnect = false;
  }

  async onModuleInit() {
    if (this.skipConnect) {
      return;
    }
    await this.$connect();
  }

  async onModuleDestroy() {
    if (this.skipConnect) {
      return;
    }
    await this.$disconnect();
    await this.pool?.end();
  }
}
