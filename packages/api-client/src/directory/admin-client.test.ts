import { afterEach, describe, expect, it, vi } from "vitest";
import { createAdminDirectoryClient } from "./admin-client.js";

describe("admin directory api client", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("sends auth scope headers when listing restaurants", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          items: [],
          pageInfo: { page: 1, pageSize: 20, total: 0, hasNextPage: false },
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = createAdminDirectoryClient({
      baseUrl: "http://localhost:3000",
      accessToken: "token-1",
      tenantId: "tenant-1",
      workspaceId: "workspace-1",
    });

    await client.listRestaurants({ page: 1, pageSize: 20 });

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer token-1");
    expect(headers["X-Tenant-Id"]).toBe("tenant-1");
    expect(headers["X-Workspace-Id"]).toBe("workspace-1");
  });

  it("sends idempotency key when creating a restaurant", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          restaurant: {
            id: "restaurant-1",
            slug: "pho-test",
            name: "Pho Test",
            shortDescription: null,
            phone: null,
            website: null,
            priceRange: null,
            dishTags: ["pho"],
            neighborhoodSlug: null,
            addressLine: "Street 1",
            postalCode: "10115",
            city: "Berlin",
            lat: null,
            lng: null,
            openingHoursJson: null,
            status: "HIDDEN",
            createdAt: "2026-02-22T00:00:00.000Z",
            updatedAt: "2026-02-22T00:00:00.000Z",
          },
        }),
        {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }
      )
    );
    vi.stubGlobal("fetch", fetchMock);

    const client = createAdminDirectoryClient({
      baseUrl: "http://localhost:3000",
      accessToken: "token-1",
      tenantId: "tenant-1",
      workspaceId: "workspace-1",
    });

    await client.createRestaurant(
      {
        name: "Pho Test",
        slug: "pho-test",
        status: "HIDDEN",
        dishTags: ["pho"],
        addressLine: "Street 1",
        postalCode: "10115",
        city: "Berlin",
      },
      { idempotencyKey: "idem-1" }
    );

    const init = fetchMock.mock.calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers["X-Idempotency-Key"]).toBe("idem-1");
  });
});
