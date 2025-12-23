import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

let cachedPrisma: PrismaClient | undefined;
let cachedPool: Pool | undefined;

/**
 * @deprecated Use PrismaService via dependency injection instead.
 * This function is kept for backward compatibility during migration.
 */
export function getPrisma(): PrismaClient {
  if (cachedPrisma) return cachedPrisma;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL must be set before accessing Prisma client");
  }
  cachedPool = cachedPool ?? new Pool({ connectionString: url });
  const adapter = new PrismaPg(cachedPool);
  cachedPrisma = new PrismaClient({ adapter });
  return cachedPrisma;
}

/**
 * @deprecated Use PrismaService lifecycle management instead.
 */
export async function resetPrisma(): Promise<void> {
  if (cachedPrisma) {
    await cachedPrisma.$disconnect();
  }
  if (cachedPool) {
    await cachedPool.end();
  }
  cachedPrisma = undefined;
  cachedPool = undefined;
}

export { PrismaClient };

/**
 * @deprecated Use PrismaService via dependency injection instead.
 * Exported for backward compatibility during migration.
 * Removed eager initialization to avoid errors when DATABASE_URL is not set.
 * Use getPrisma() function instead if you need the legacy singleton.
 */
// export const prisma = getPrisma();
