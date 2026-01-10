import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { PostgresTestDb, createTenant, createTestDb, stopSharedContainer } from "@corely/testkit";
import { PrismaService, resetPrisma } from "@corely/data";
import { PrismaChatStoreAdapter } from "../infrastructure/adapters/prisma-chat-store.adapter";
import { type CopilotUIMessage } from "../domain/types/ui-message";

vi.setConfig({ hookTimeout: 120_000, testTimeout: 120_000 });

describe("PrismaChatStoreAdapter (integration)", () => {
  let db: PostgresTestDb;
  let prisma: PrismaService;
  let adapter: PrismaChatStoreAdapter;

  beforeAll(async () => {
    db = await createTestDb();
    prisma = db.client;
    adapter = new PrismaChatStoreAdapter(prisma);
  });

  beforeEach(async () => {
    await db.reset();
  });

  afterAll(async () => {
    await db.down();
    await resetPrisma();
    await stopSharedContainer();
  });

  it("saves messages and merges metadata", async () => {
    const tenant = await createTenant(prisma);
    const chatId = "run-1";

    const message: CopilotUIMessage = {
      id: "msg-1",
      role: "assistant",
      parts: [{ type: "text", text: "Collecting inputs..." }],
      metadata: { runId: chatId },
    };

    await adapter.save({
      chatId,
      tenantId: tenant.id,
      messages: [message],
      metadata: {
        userId: "user-1",
        workspaceId: tenant.id,
        taskState: {
          taskType: "collect_inputs",
          toolCallId: "tool-1",
          status: "pending",
          title: "Invoice Details",
          createdAt: "2025-01-01T00:00:00.000Z",
        },
      },
    });

    const firstLoad = await adapter.load({ chatId, tenantId: tenant.id });
    expect(firstLoad.messages).toHaveLength(1);
    expect(firstLoad.messages[0].parts?.[0]).toEqual({
      type: "text",
      text: "Collecting inputs...",
    });
    expect(firstLoad.messages[0].metadata).toEqual({ runId: chatId });
    expect(firstLoad.metadata?.workspaceId).toBe(tenant.id);

    const updatedMessage: CopilotUIMessage = {
      id: "msg-1",
      role: "assistant",
      parts: [{ type: "text", text: "Inputs received." }],
      metadata: { runId: chatId },
    };

    await adapter.save({
      chatId,
      tenantId: tenant.id,
      messages: [updatedMessage],
      metadata: {
        taskState: {
          taskType: "collect_inputs",
          toolCallId: "tool-1",
          status: "completed",
          title: "Invoice Details",
          createdAt: "2025-01-01T00:00:00.000Z",
          completedAt: "2025-01-02T00:00:00.000Z",
        },
      },
    });

    const secondLoad = await adapter.load({ chatId, tenantId: tenant.id });
    expect(secondLoad.messages).toHaveLength(1);
    expect(secondLoad.messages[0].parts?.[0]).toEqual({
      type: "text",
      text: "Inputs received.",
    });
    expect(secondLoad.metadata?.workspaceId).toBe(tenant.id);
    expect(secondLoad.metadata?.taskState?.status).toBe("completed");
  });
});
