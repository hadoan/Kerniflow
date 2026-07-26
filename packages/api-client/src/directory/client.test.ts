import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../errors.js";
import { createDirectoryClient } from "./client.js";

describe("directory api client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("lists restaurants with query params", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          items: [
            {
              id: "r1",
              slug: "pho-viet-mitte",
              name: "Pho Viet Mitte",
              shortDescription: null,
              dishTags: ["pho"],
              neighborhoodSlug: "mitte",
              addressLine: "Rosenthaler Str. 10",
              postalCode: "10119",
              city: "Berlin",
              priceRange: "$$",
              status: "ACTIVE",
            },
          ],
          pageInfo: {
            page: 1,
            pageSize: 20,
            total: 1,
            hasNextPage: false,
          },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = createDirectoryClient({ baseUrl: "http://localhost:3000" });
    const result = await client.listRestaurants({ page: 1, pageSize: 20, q: "pho" });

    expect(result.items).toHaveLength(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    const call = fetchMock.mock.calls[0];
    expect(call[0]).toBe(
      "http://localhost:3000/v1/public/berlin/restaurants?q=pho&page=1&pageSize=20"
    );
  });

  it("sends idempotency header when creating lead", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ leadId: "lead-1" }), {
        status: 201,
        headers: { "Content-Type": "application/json" },
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = createDirectoryClient({ baseUrl: "http://localhost:3000" });
    const response = await client.createLead(
      {
        restaurantSlug: "pho-viet-mitte",
        name: "An",
        contact: "an@example.com",
        message: "Need catering",
      },
      { idempotencyKey: "idem-1", correlationId: "corr-1" }
    );

    expect(response.leadId).toBe("lead-1");

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers["X-Idempotency-Key"]).toBe("idem-1");
    expect(headers["X-Correlation-Id"]).toBe("corr-1");
  });

  it("normalizes API errors", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          type: "about:blank",
          title: "Not Found",
          status: 404,
          detail: "Restaurant not found",
          instance: "/v1/public/berlin/restaurants/missing",
          code: "Directory:RestaurantNotFound",
          traceId: "trace-1",
        }),
        {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = createDirectoryClient({ baseUrl: "http://localhost:3000" });

    await expect(client.getRestaurantBySlug("missing")).rejects.toBeInstanceOf(ApiError);
  });
});
