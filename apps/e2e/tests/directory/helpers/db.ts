import { PrismaClient, type DirectoryRestaurantStatus } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { DIRECTORY_EVENT_TYPES } from "@corely/contracts";
import { Pool } from "pg";
import { loadDirectoryE2eEnv } from "./env.ts";

loadDirectoryE2eEnv();

export type DirectoryScope = {
  tenantId: string;
  workspaceId: string;
};

export type DirectoryRestaurantFixture = {
  slug: string;
  name: string;
  shortDescription?: string | null;
  dishTags: string[];
  neighborhoodSlug: string;
  addressLine: string;
  postalCode: string;
  city?: string;
  status: DirectoryRestaurantStatus;
};

let prismaSingleton: PrismaClient | null = null;
let poolSingleton: Pool | null = null;

export const DIRECTORY_SCOPE: DirectoryScope = {
  tenantId: process.env.DIRECTORY_PUBLIC_TENANT_ID ?? "directory-public-tenant",
  workspaceId: process.env.DIRECTORY_PUBLIC_WORKSPACE_ID ?? "directory-public-workspace",
};
const WORKER_IDEMPOTENCY_ACTION_KEY = "usecase";
const WORKER_IDEMPOTENCY_TENANT = "__global__";

function ensureDatabaseUrl(): void {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL must be set to run directory e2e tests");
  }
}

function getPool(): Pool {
  ensureDatabaseUrl();

  if (!poolSingleton) {
    poolSingleton = new Pool({
      connectionString: process.env.DATABASE_URL,
    });
  }

  return poolSingleton;
}

export function getPrisma(): PrismaClient {
  ensureDatabaseUrl();

  if (!prismaSingleton) {
    const adapter = new PrismaPg(getPool());
    prismaSingleton = new PrismaClient({ adapter });
  }

  return prismaSingleton;
}

export async function closePrisma(): Promise<void> {
  if (prismaSingleton) {
    await prismaSingleton.$disconnect();
    prismaSingleton = null;
  }

  if (poolSingleton) {
    await poolSingleton.end();
    poolSingleton = null;
  }
}

export async function ensureDirectorySchemaReady(): Promise<void> {
  const prisma = getPrisma();

  const rows = await prisma.$queryRaw<
    Array<{
      restaurant_table: string | null;
      lead_table: string | null;
      outbox_table: string | null;
      idempotency_table: string | null;
    }>
  >`
    SELECT
      to_regclass('content."DirectoryRestaurant"')::text AS restaurant_table,
      to_regclass('content."DirectoryLead"')::text AS lead_table,
      to_regclass('workflow."OutboxEvent"')::text AS outbox_table,
      to_regclass('workflow."IdempotencyKey"')::text AS idempotency_table
  `;

  const info = rows[0];
  if (
    !info?.restaurant_table ||
    !info.lead_table ||
    !info.outbox_table ||
    !info.idempotency_table
  ) {
    throw new Error(
      "Directory tables are missing. Apply migrations before running e2e (pnpm --filter @corely/data exec prisma migrate deploy)."
    );
  }
}

export async function seedDirectoryRestaurants(
  fixtures: DirectoryRestaurantFixture[]
): Promise<void> {
  const prisma = getPrisma();

  for (const item of fixtures) {
    await prisma.directoryRestaurant.upsert({
      where: {
        tenantId_workspaceId_slug: {
          tenantId: DIRECTORY_SCOPE.tenantId,
          workspaceId: DIRECTORY_SCOPE.workspaceId,
          slug: item.slug,
        },
      },
      update: {
        name: item.name,
        shortDescription: item.shortDescription ?? null,
        dishTags: item.dishTags,
        neighborhoodSlug: item.neighborhoodSlug,
        addressLine: item.addressLine,
        postalCode: item.postalCode,
        city: item.city ?? "Berlin",
        status: item.status,
      },
      create: {
        tenantId: DIRECTORY_SCOPE.tenantId,
        workspaceId: DIRECTORY_SCOPE.workspaceId,
        slug: item.slug,
        name: item.name,
        shortDescription: item.shortDescription ?? null,
        dishTags: item.dishTags,
        neighborhoodSlug: item.neighborhoodSlug,
        addressLine: item.addressLine,
        postalCode: item.postalCode,
        city: item.city ?? "Berlin",
        status: item.status,
      },
    });
  }
}

export async function cleanupDirectoryFixturesByPrefix(slugPrefix: string): Promise<void> {
  const prisma = getPrisma();

  const restaurants = await prisma.directoryRestaurant.findMany({
    where: {
      tenantId: DIRECTORY_SCOPE.tenantId,
      workspaceId: DIRECTORY_SCOPE.workspaceId,
      slug: {
        startsWith: slugPrefix,
      },
    },
    select: {
      id: true,
      slug: true,
    },
  });

  const restaurantIds = restaurants.map((restaurant) => restaurant.id);

  if (restaurantIds.length > 0) {
    await prisma.directoryLead.deleteMany({
      where: {
        tenantId: DIRECTORY_SCOPE.tenantId,
        workspaceId: DIRECTORY_SCOPE.workspaceId,
        restaurantId: {
          in: restaurantIds,
        },
      },
    });
  }

  const outboxEvents = await prisma.outboxEvent.findMany({
    where: {
      tenantId: DIRECTORY_SCOPE.tenantId,
      eventType: DIRECTORY_EVENT_TYPES.LEAD_CREATED,
      payloadJson: {
        contains: slugPrefix,
      },
    },
    select: {
      id: true,
    },
  });

  const outboxEventIds = outboxEvents.map((event) => event.id);

  if (outboxEventIds.length > 0) {
    await prisma.idempotencyKey.deleteMany({
      where: {
        OR: [{ tenantId: null }, { tenantId: WORKER_IDEMPOTENCY_TENANT }],
        actionKey: "usecase",
        key: {
          in: outboxEventIds.map((eventId) => `${DIRECTORY_EVENT_TYPES.LEAD_CREATED}:${eventId}`),
        },
      },
    });

    await prisma.outboxEvent.deleteMany({
      where: {
        id: {
          in: outboxEventIds,
        },
      },
    });
  }

  await prisma.idempotencyKey.deleteMany({
    where: {
      tenantId: DIRECTORY_SCOPE.tenantId,
      actionKey: "directory.create-lead",
      key: {
        startsWith: slugPrefix,
      },
    },
  });

  await prisma.directoryRestaurant.deleteMany({
    where: {
      tenantId: DIRECTORY_SCOPE.tenantId,
      workspaceId: DIRECTORY_SCOPE.workspaceId,
      slug: {
        startsWith: slugPrefix,
      },
    },
  });
}

export async function findLeadById(leadId: string) {
  return getPrisma().directoryLead.findUnique({
    where: { id: leadId },
  });
}

export async function findLeadCreatedOutboxEventsByLeadId(leadId: string) {
  return getPrisma().outboxEvent.findMany({
    where: {
      tenantId: DIRECTORY_SCOPE.tenantId,
      eventType: DIRECTORY_EVENT_TYPES.LEAD_CREATED,
      payloadJson: {
        contains: leadId,
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });
}

export async function findOutboxEventById(eventId: string) {
  return getPrisma().outboxEvent.findUnique({
    where: {
      id: eventId,
    },
  });
}

export async function countRestaurantsByPrefix(slugPrefix: string): Promise<number> {
  return getPrisma().directoryRestaurant.count({
    where: {
      tenantId: DIRECTORY_SCOPE.tenantId,
      workspaceId: DIRECTORY_SCOPE.workspaceId,
      slug: {
        startsWith: slugPrefix,
      },
    },
  });
}

export async function rewindOutboxEventForReplay(eventId: string): Promise<void> {
  await getPrisma().outboxEvent.update({
    where: { id: eventId },
    data: {
      status: "PENDING",
      attempts: 0,
      availableAt: new Date(),
      lockedBy: null,
      lockedUntil: null,
      lastError: null,
    },
  });
}

export async function clearWorkerIdempotencyForEvent(eventId: string): Promise<void> {
  await getPrisma().idempotencyKey.deleteMany({
    where: {
      OR: [{ tenantId: null }, { tenantId: WORKER_IDEMPOTENCY_TENANT }],
      actionKey: WORKER_IDEMPOTENCY_ACTION_KEY,
      key: `${DIRECTORY_EVENT_TYPES.LEAD_CREATED}:${eventId}`,
    },
  });
}

export async function countWorkerIdempotencyForEvent(eventId: string): Promise<number> {
  return getPrisma().idempotencyKey.count({
    where: {
      OR: [{ tenantId: null }, { tenantId: WORKER_IDEMPOTENCY_TENANT }],
      actionKey: WORKER_IDEMPOTENCY_ACTION_KEY,
      key: `${DIRECTORY_EVENT_TYPES.LEAD_CREATED}:${eventId}`,
    },
  });
}
