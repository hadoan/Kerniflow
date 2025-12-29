import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PostgresTestDb, createTestDb, stopSharedContainer } from "@kerniflow/testkit";
import {
  PrismaService,
  WorkflowDefinitionRepository,
  WorkflowEventRepository,
  WorkflowInstanceRepository,
  WorkflowTaskRepository,
  resetPrisma,
} from "@kerniflow/data";

vi.setConfig({ hookTimeout: 120_000, testTimeout: 120_000 });

describe("Workflow repositories (Postgres)", () => {
  let db: PostgresTestDb;
  let prisma: PrismaService;
  let definitions: WorkflowDefinitionRepository;
  let instances: WorkflowInstanceRepository;
  let tasks: WorkflowTaskRepository;
  let events: WorkflowEventRepository;

  beforeAll(async () => {
    db = await createTestDb();
    prisma = db.client;
    definitions = new WorkflowDefinitionRepository(prisma);
    instances = new WorkflowInstanceRepository(prisma);
    tasks = new WorkflowTaskRepository(prisma);
    events = new WorkflowEventRepository(prisma);
  });

  beforeEach(async () => {
    await db.reset();
  });

  afterAll(async () => {
    await db.down();
    await resetPrisma();
    await stopSharedContainer();
  });

  it("claims a task only once", async () => {
    const def = await definitions.create({
      tenantId: "tenant-1",
      key: "hello",
      version: 1,
      name: "Hello",
      description: null,
      status: "ACTIVE",
      spec: JSON.stringify({ initial: "start", states: { start: {} } }),
      createdBy: null,
    });

    const instance = await instances.create({
      tenantId: "tenant-1",
      definitionId: def.id,
      businessKey: null,
      status: "PENDING",
      currentState: "start",
      context: "{}",
      startedAt: new Date(),
    });

    const [task] = await tasks.createTasks([
      {
        tenantId: "tenant-1",
        instanceId: instance.id,
        name: "test",
        type: "SYSTEM",
        status: "PENDING",
        input: "{}",
      },
    ]);

    const first = await tasks.claimTask("tenant-1", task.id, "worker-1", new Date());
    const second = await tasks.claimTask("tenant-1", task.id, "worker-2", new Date());

    expect(first).not.toBeNull();
    expect(second).toBeNull();
  });

  it("prevents task duplication with idempotency keys", async () => {
    const def = await definitions.create({
      tenantId: "tenant-1",
      key: "hello",
      version: 1,
      name: "Hello",
      description: null,
      status: "ACTIVE",
      spec: JSON.stringify({ initial: "start", states: { start: {} } }),
      createdBy: null,
    });

    const instance = await instances.create({
      tenantId: "tenant-1",
      definitionId: def.id,
      businessKey: null,
      status: "PENDING",
      currentState: "start",
      context: "{}",
      startedAt: new Date(),
    });

    await tasks.createTasks([
      {
        tenantId: "tenant-1",
        instanceId: instance.id,
        name: "idempotent",
        type: "SYSTEM",
        status: "PENDING",
        input: "{}",
        idempotencyKey: "task-key",
      },
      {
        tenantId: "tenant-1",
        instanceId: instance.id,
        name: "idempotent",
        type: "SYSTEM",
        status: "PENDING",
        input: "{}",
        idempotencyKey: "task-key",
      },
    ]);

    const count = await prisma.task.count({ where: { tenantId: "tenant-1" } });
    expect(count).toBe(1);
  });

  it("rolls back snapshot updates and history together", async () => {
    const def = await definitions.create({
      tenantId: "tenant-1",
      key: "hello",
      version: 1,
      name: "Hello",
      description: null,
      status: "ACTIVE",
      spec: JSON.stringify({ initial: "start", states: { start: {} } }),
      createdBy: null,
    });

    const instance = await instances.create({
      tenantId: "tenant-1",
      definitionId: def.id,
      businessKey: null,
      status: "PENDING",
      currentState: "start",
      context: "{}",
      startedAt: new Date(),
    });

    const original = await prisma.workflowInstance.findUniqueOrThrow({
      where: { id: instance.id },
    });

    await prisma
      .$transaction(async (tx) => {
        await instances.updateSnapshotIfCurrent(
          "tenant-1",
          instance.id,
          original.updatedAt,
          {
            status: "RUNNING",
            currentState: "next",
            context: JSON.stringify({ ok: true }),
          },
          tx as any
        );

        await events.append(
          {
            tenantId: "tenant-1",
            instanceId: instance.id,
            type: "STATE_TRANSITION",
            payload: JSON.stringify({ from: "start", to: "next" }),
          },
          tx as any
        );

        await tasks.createTasks(
          [
            {
              tenantId: "tenant-1",
              instanceId: instance.id,
              name: "rollback",
              type: "SYSTEM",
              status: "PENDING",
              input: "{}",
            },
          ],
          tx as any
        );

        throw new Error("force rollback");
      })
      .catch(() => undefined);

    const reloaded = await prisma.workflowInstance.findUniqueOrThrow({
      where: { id: instance.id },
    });
    const taskCount = await prisma.task.count({ where: { instanceId: instance.id } });
    const eventCount = await prisma.workflowEvent.count({ where: { instanceId: instance.id } });

    expect(reloaded.currentState).toBe(original.currentState);
    expect(taskCount).toBe(0);
    expect(eventCount).toBe(0);
  });
});
