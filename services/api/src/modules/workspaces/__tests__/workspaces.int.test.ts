import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { Test } from "@nestjs/testing";
import { WorkspacesModule } from "../workspaces.module";
import { CreateWorkspaceUseCase } from "../application/use-cases/create-workspace.usecase";
import { ListWorkspacesUseCase } from "../application/use-cases/list-workspaces.usecase";
import { GetWorkspaceUseCase } from "../application/use-cases/get-workspace.usecase";
import { DataModule, PrismaService } from "@corely/data";
import { createTestDb, type PostgresTestDb, stopSharedContainer } from "@corely/testkit";

describe("Workspaces Module Integration", () => {
  vi.setConfig({ hookTimeout: 120_000, testTimeout: 120_000 });
  let moduleRef: any;
  let prisma: PrismaService;
  let createWorkspace: CreateWorkspaceUseCase;
  let listWorkspaces: ListWorkspacesUseCase;
  let getWorkspace: GetWorkspaceUseCase;
  let db: PostgresTestDb;

  const TEST_TENANT_ID = "test-tenant-" + Date.now();
  const TEST_USER_ID = "test-user-" + Date.now();

  beforeAll(async () => {
    db = await createTestDb();
    moduleRef = await Test.createTestingModule({
      imports: [DataModule, WorkspacesModule],
    }).compile();

    prisma = moduleRef.get(PrismaService);
    createWorkspace = moduleRef.get(CreateWorkspaceUseCase);
    listWorkspaces = moduleRef.get(ListWorkspacesUseCase);
    getWorkspace = moduleRef.get(GetWorkspaceUseCase);

    prisma = moduleRef.get(PrismaService);
  });

  beforeEach(async () => {
    await db.reset();
    // Create test tenant and user
    await prisma.tenant.create({
      data: {
        id: TEST_TENANT_ID,
        name: "Test Tenant",
        slug: "test-tenant-" + Date.now(),
      },
    });

    await prisma.user.create({
      data: {
        id: TEST_USER_ID,
        email: `test-${Date.now()}@example.com`,
        passwordHash: "hash",
      },
    });
  });

  afterAll(async () => {
    if (moduleRef) {
      await moduleRef.close();
    }
    if (db) {
      await db.down();
    }
    await stopSharedContainer();
  });

  it("should create workspace and list it", async () => {
    const result = await createWorkspace.execute({
      tenantId: TEST_TENANT_ID,
      userId: TEST_USER_ID,
      name: "My First Workspace",
      kind: "COMPANY",
      legalName: "My Company LLC",
      countryCode: "US",
      currency: "USD",
    });

    expect(result.workspace.id).toBeDefined();
    expect(result.workspace.name).toBe("My First Workspace");
    expect(result.membership.role).toBe("OWNER");

    const list = await listWorkspaces.execute({
      tenantId: TEST_TENANT_ID,
      userId: TEST_USER_ID,
    });

    expect(list.workspaces.length).toBeGreaterThan(0);
    expect(list.workspaces[0].name).toBe("My First Workspace");
  });

  it("should get workspace by id", async () => {
    const created = await createWorkspace.execute({
      tenantId: TEST_TENANT_ID,
      userId: TEST_USER_ID,
      name: "Second Workspace",
      kind: "PERSONAL",
      legalName: "John Doe",
      countryCode: "DE",
      currency: "EUR",
    });

    const fetched = await getWorkspace.execute({
      tenantId: TEST_TENANT_ID,
      userId: TEST_USER_ID,
      workspaceId: created.workspace.id,
    });

    expect(fetched.workspace.id).toBe(created.workspace.id);
    expect(fetched.workspace.name).toBe("Second Workspace");
    expect(fetched.workspace.kind).toBe("PERSONAL");
  });
});
