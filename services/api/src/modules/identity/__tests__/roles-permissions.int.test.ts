import type { INestApplication } from "@nestjs/common";
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  PostgresTestDb,
  createApiTestApp,
  createTestDb,
  seedDefaultTenant,
  stopSharedContainer,
} from "@corely/testkit";

vi.setConfig({ hookTimeout: 120_000, testTimeout: 120_000 });

describe("Identity roles permissions (E2E)", () => {
  let app: INestApplication;
  let server: any;
  let db: PostgresTestDb;

  beforeAll(async () => {
    db = await createTestDb();
    app = await createApiTestApp(db);
    server = app.getHttpServer();
  });

  beforeEach(async () => {
    await db.reset();
  });

  afterAll(async () => {
    await app.close();
    await db.down();
    await stopSharedContainer();
  });

  const login = async (email: string, password: string, tenantId: string) => {
    const res = await request(server).post("/auth/login").send({ email, password, tenantId });
    expect(res.status).toBe(201);
    return res.body.accessToken as string;
  };

  it("blocks access without settings.roles.manage", async () => {
    const seed = await seedDefaultTenant(app);
    const prisma = db.client;

    const adminRole = await prisma.role.findFirst({
      where: { tenantId: seed.tenantId, systemKey: "ADMIN" },
    });

    expect(adminRole).toBeTruthy();

    await prisma.membership.updateMany({
      where: { tenantId: seed.tenantId, userId: seed.userId },
      data: { roleId: adminRole!.id },
    });

    const token = await login("owner@example.com", "Password123!", seed.tenantId);
    const res = await request(server)
      .get("/identity/roles")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it("does not allow cross-tenant role access", async () => {
    const tenantA = await seedDefaultTenant(app);
    const tenantB = await seedDefaultTenant(app);
    const prisma = db.client;

    const roleInTenantB = await prisma.role.findFirst({
      where: { tenantId: tenantB.tenantId, systemKey: "OWNER" },
    });

    expect(roleInTenantB).toBeTruthy();

    const tokenA = await login("owner@example.com", "Password123!", tenantA.tenantId);
    const res = await request(server)
      .get(`/identity/roles/${roleInTenantB!.id}/permissions`)
      .set("Authorization", `Bearer ${tokenA}`);

    expect(res.status).toBe(404);
  });
});
