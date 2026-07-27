import { test, expect } from "@playwright/test";
import { CreateDirectoryLeadResponseSchema } from "@corely/contracts";
import { assertApiReady } from "../helpers/bootstrap-api.ts";
import { runOutboxWorkerTick } from "../helpers/bootstrap-worker.ts";
import {
  clearWorkerIdempotencyForEvent,
  closePrisma,
  countWorkerIdempotencyForEvent,
  ensureDirectorySchemaReady,
  findLeadCreatedOutboxEventsByLeadId,
  findOutboxEventById,
  rewindOutboxEventForReplay,
} from "../helpers/db.ts";
import {
  cleanupDirectoryFixtureSet,
  createRunTag,
  seedDirectoryFixtureSet,
} from "../helpers/directory-seed.ts";
import { API_BASE_URL } from "../helpers/http.ts";

test.describe("Directory UC-04: worker handles DirectoryLeadCreated idempotently", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(({ browserName }) => browserName !== "chromium", "Worker e2e runs once in chromium.");

  let runTag = "";
  let fixturePrefix = "";
  let activeSlug = "";

  test.beforeAll(async ({ request }) => {
    runTag = createRunTag("uc04-worker");
    await assertApiReady(request);
    await ensureDirectorySchemaReady();

    const seeded = await seedDirectoryFixtureSet(runTag);
    fixturePrefix = seeded.prefix;
    activeSlug = seeded.activeSlug;
  });

  test.afterAll(async () => {
    if (fixturePrefix) {
      await cleanupDirectoryFixtureSet(fixturePrefix);
    }
    await closePrisma();
  });

  test("processes one outbox event and remains idempotent on re-run", async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/v1/public/berlin/leads`, {
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": `${fixturePrefix}idem-worker`,
      },
      data: {
        restaurantSlug: activeSlug,
        name: "Worker Probe",
        contact: "worker.probe@example.com",
        message: `${runTag} worker idempotency flow`,
      },
    });

    expect(response.status()).toBe(201);
    const lead = CreateDirectoryLeadResponseSchema.parse(await response.json());

    const outboxEvents = await findLeadCreatedOutboxEventsByLeadId(lead.leadId);
    expect(outboxEvents).toHaveLength(1);

    const eventId = outboxEvents[0]?.id;
    expect(eventId).toBeTruthy();
    if (!eventId) {
      throw new Error("Missing outbox event id for lead");
    }

    // Reset event state to ensure this test deterministically exercises the handler itself.
    await clearWorkerIdempotencyForEvent(eventId);
    await rewindOutboxEventForReplay(eventId);

    await runOutboxWorkerTick();

    await expect
      .poll(async () => {
        const count = await countWorkerIdempotencyForEvent(eventId);
        const event = await findOutboxEventById(eventId);
        return {
          idempotencyCount: count,
          outboxStatus: event?.status,
        };
      })
      .toEqual({
        idempotencyCount: 1,
        outboxStatus: "SENT",
      });

    await runOutboxWorkerTick();

    await expect
      .poll(async () => {
        return {
          idempotencyCount: await countWorkerIdempotencyForEvent(eventId),
          outboxStatus: (await findOutboxEventById(eventId))?.status,
        };
      })
      .toEqual({
        idempotencyCount: 1,
        outboxStatus: "SENT",
      });
  });
});
