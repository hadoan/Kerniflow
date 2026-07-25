import { test, expect, type APIRequestContext, type APIResponse } from "@playwright/test";
import {
  DIRECTORY_ERROR_CODES,
  type CreateDirectoryLeadRequest,
  CreateDirectoryLeadResponseSchema,
} from "@corely/contracts";
import { assertApiReady } from "../helpers/bootstrap-api.ts";
import {
  closePrisma,
  ensureDirectorySchemaReady,
  findLeadById,
  findLeadCreatedOutboxEventsByLeadId,
} from "../helpers/db.ts";
import {
  cleanupDirectoryFixtureSet,
  createRunTag,
  seedDirectoryFixtureSet,
} from "../helpers/directory-seed.ts";
import { API_BASE_URL, expectProblemDetails } from "../helpers/http.ts";

test.describe("Directory UC-03: create lead (public, idempotent)", () => {
  test.describe.configure({ mode: "serial" });
  test.skip(({ browserName }) => browserName !== "chromium", "API e2e runs once in chromium.");

  let runTag = "";
  let fixturePrefix = "";
  let activeSlug = "";

  test.beforeAll(async ({ request }) => {
    runTag = createRunTag("uc03-lead");
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

  const postLead = async (
    request: APIRequestContext,
    payload: CreateDirectoryLeadRequest,
    idempotencyKey?: string
  ): Promise<APIResponse> => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (idempotencyKey) {
      headers["Idempotency-Key"] = idempotencyKey;
    }

    return request.post(`${API_BASE_URL}/v1/public/berlin/leads`, {
      headers,
      data: payload,
    });
  };

  test("creates one lead and one outbox event", async ({ request }) => {
    const idempotencyKey = `${fixturePrefix}idem-success`;
    const response = await postLead(
      request,
      {
        restaurantSlug: activeSlug,
        name: "An Tran",
        contact: "an.tran@example.com",
        message: `${runTag} catering request`,
      },
      idempotencyKey
    );

    expect(response.status()).toBe(201);
    const body = CreateDirectoryLeadResponseSchema.parse(await response.json());

    const lead = await findLeadById(body.leadId);
    expect(lead).not.toBeNull();
    expect(lead?.message).toBe(`${runTag} catering request`);

    const events = await findLeadCreatedOutboxEventsByLeadId(body.leadId);
    expect(events).toHaveLength(1);
    expect(events[0]?.eventType).toBe("directory.lead.created");
  });

  test("replays same lead on same idempotency key", async ({ request }) => {
    const idempotencyKey = `${fixturePrefix}idem-replay`;
    const payload: CreateDirectoryLeadRequest = {
      restaurantSlug: activeSlug,
      name: "Bao Nguyen",
      contact: "bao.nguyen@example.com",
      message: `${runTag} replay request`,
    };

    const first = await postLead(request, payload, idempotencyKey);
    const second = await postLead(request, payload, idempotencyKey);

    expect(first.status()).toBe(201);
    expect(second.status()).toBe(201);

    const firstBody = CreateDirectoryLeadResponseSchema.parse(await first.json());
    const secondBody = CreateDirectoryLeadResponseSchema.parse(await second.json());

    expect(firstBody.leadId).toBe(secondBody.leadId);

    const events = await findLeadCreatedOutboxEventsByLeadId(firstBody.leadId);
    expect(events).toHaveLength(1);
  });

  test("returns conflict when idempotency key is reused with different payload", async ({
    request,
  }) => {
    const idempotencyKey = `${fixturePrefix}idem-conflict`;

    const first = await postLead(
      request,
      {
        restaurantSlug: activeSlug,
        name: "Lan Do",
        contact: "lan.do@example.com",
        message: `${runTag} first message`,
      },
      idempotencyKey
    );

    expect(first.status()).toBe(201);

    const second = await postLead(
      request,
      {
        restaurantSlug: activeSlug,
        name: "Lan Do",
        contact: "lan.do@example.com",
        message: `${runTag} changed message`,
      },
      idempotencyKey
    );

    await expectProblemDetails(
      second,
      409,
      DIRECTORY_ERROR_CODES.IDEMPOTENCY_KEY_REUSED_WITH_DIFFERENT_PAYLOAD
    );
  });

  test("returns 400 for missing idempotency key", async ({ request }) => {
    const response = await postLead(request, {
      restaurantSlug: activeSlug,
      name: "No Key",
      contact: "nokey@example.com",
      message: "Missing header test",
    });

    await expectProblemDetails(response, 400, DIRECTORY_ERROR_CODES.IDEMPOTENCY_KEY_REQUIRED);
  });

  test("returns 400 with validation problem details for invalid payload", async ({ request }) => {
    const response = await postLead(
      request,
      {
        restaurantSlug: activeSlug,
        name: "Invalid Payload",
        contact: "",
        message: "",
      },
      `${fixturePrefix}idem-invalid`
    );

    const problem = await expectProblemDetails(response, 400);
    expect(Array.isArray(problem.validationErrors)).toBe(true);
    expect(problem.validationErrors?.length ?? 0).toBeGreaterThan(0);
  });

  test("returns 404 when restaurant slug does not exist", async ({ request }) => {
    const response = await postLead(
      request,
      {
        restaurantSlug: `${runTag}-does-not-exist`,
        name: "Ghost",
        contact: "ghost@example.com",
        message: "This restaurant does not exist",
      },
      `${fixturePrefix}idem-missing-restaurant`
    );

    await expectProblemDetails(response, 404, DIRECTORY_ERROR_CODES.RESTAURANT_NOT_FOUND);
  });
});
