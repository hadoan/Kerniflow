import { CustomerDtoSchema } from "@corely/contracts";
import type { APIRequestContext } from "@playwright/test";
import { expect, test } from "./fixtures.ts";

const API_URL = process.env.API_URL || "http://localhost:3000";

type LoginResponse = {
  accessToken: string;
};

type RoleListResponse = {
  roles: Array<{
    id: string;
    systemKey: string | null;
  }>;
};

type TestAuthContext = {
  accessToken: string;
  tenantId: string;
};

type SocialLinkPayload = {
  type: "SOCIAL";
  platform: "linkedin" | "facebook" | "instagram" | "x" | "github" | "tiktok" | "youtube" | "other";
  url: string;
  label?: string;
  isPrimary?: boolean;
};

function authHeaders(auth: TestAuthContext, workspaceId?: string): Record<string, string> {
  return {
    Authorization: `Bearer ${auth.accessToken}`,
    "Content-Type": "application/json",
    ...(workspaceId ? { "X-Workspace-Id": workspaceId } : {}),
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function parseCustomerPayload(body: unknown) {
  const record = asRecord(body);
  const candidate =
    asRecord(record.customer) && Object.keys(asRecord(record.customer)).length
      ? record.customer
      : body;
  return CustomerDtoSchema.parse(candidate);
}

function normalizeSocialLinks(
  links: Array<{ platform: string; url: string; label?: string; isPrimary?: boolean }>
) {
  return [...links]
    .map((link) => ({
      platform: link.platform,
      url: link.url,
      label: link.label ?? undefined,
      isPrimary: Boolean(link.isPrimary),
    }))
    .sort((a, b) => a.platform.localeCompare(b.platform));
}

async function responseBody(response: {
  json: () => Promise<unknown>;
  text: () => Promise<string>;
}) {
  try {
    return await response.json();
  } catch {
    return await response.text();
  }
}

async function loginApi(
  request: APIRequestContext,
  creds: { email: string; password: string; tenantId: string }
): Promise<TestAuthContext> {
  const res = await request.post(`${API_URL}/auth/login`, {
    data: {
      email: creds.email,
      password: creds.password,
      tenantId: creds.tenantId,
    },
  });
  expect(res.status()).toBe(201);
  const body = (await res.json()) as LoginResponse;
  expect(typeof body.accessToken).toBe("string");
  return {
    accessToken: body.accessToken,
    tenantId: creds.tenantId,
  };
}

async function createCustomer(
  request: APIRequestContext,
  auth: TestAuthContext,
  payload: { displayName: string; socialLinks?: SocialLinkPayload[] },
  workspaceId?: string
) {
  const response = await request.post(`${API_URL}/customers`, {
    headers: authHeaders(auth, workspaceId),
    data: payload,
  });
  return response;
}

async function getCustomer(
  request: APIRequestContext,
  auth: TestAuthContext,
  customerId: string,
  workspaceId?: string
) {
  return request.get(`${API_URL}/customers/${customerId}`, {
    headers: authHeaders(auth, workspaceId),
  });
}

async function updateCustomer(
  request: APIRequestContext,
  auth: TestAuthContext,
  customerId: string,
  patch: Record<string, unknown>,
  workspaceId?: string
) {
  return request.patch(`${API_URL}/customers/${customerId}`, {
    headers: authHeaders(auth, workspaceId),
    data: patch,
  });
}

async function createCompanyWorkspace(
  request: APIRequestContext,
  auth: TestAuthContext
): Promise<string> {
  const name = `Social Links RBAC ${Date.now()}`;
  const response = await request.post(`${API_URL}/workspaces`, {
    headers: authHeaders(auth),
    data: {
      name,
      kind: "COMPANY",
      legalName: `${name} LLC`,
      countryCode: "US",
      currency: "USD",
    },
  });
  expect(response.ok()).toBeTruthy();
  const body = asRecord(await response.json());
  const workspace = asRecord(body.workspace);
  const workspaceId = workspace.id;
  expect(typeof workspaceId).toBe("string");
  return String(workspaceId);
}

async function getOwnerRoleId(
  request: APIRequestContext,
  auth: TestAuthContext,
  workspaceId: string
) {
  const response = await request.get(`${API_URL}/identity/roles`, {
    headers: authHeaders(auth, workspaceId),
  });
  expect(response.ok()).toBeTruthy();
  const body = (await response.json()) as RoleListResponse;
  const owner = body.roles.find((role) => role.systemKey === "OWNER");
  expect(owner?.id).toBeDefined();
  return String(owner?.id);
}

async function denyCustomerManagePermission(
  request: APIRequestContext,
  auth: TestAuthContext,
  workspaceId: string,
  roleId: string
) {
  const response = await request.put(`${API_URL}/identity/roles/${roleId}/permissions`, {
    headers: authHeaders(auth, workspaceId),
    data: {
      grants: [{ key: "party.customers.manage", effect: "DENY" }],
    },
  });
  expect(response.ok()).toBeTruthy();
}

test.describe("Customer social links API", () => {
  test("CASE A: create customer without social links returns empty array", async ({
    request,
    testData,
  }) => {
    const auth = await loginApi(request, {
      email: testData.user.email,
      password: testData.user.password,
      tenantId: testData.tenant.id,
    });

    const createResponse = await createCustomer(request, auth, {
      displayName: `Social Empty ${Date.now()}`,
    });
    expect(createResponse.status()).toBe(201);
    const created = parseCustomerPayload(await createResponse.json());

    const getResponse = await getCustomer(request, auth, created.id);
    expect(getResponse.status()).toBe(200);
    const fetched = parseCustomerPayload(await getResponse.json());

    expect(Array.isArray(fetched.socialLinks)).toBe(true);
    expect(fetched.socialLinks).toEqual([]);
  });

  test("CASE B: create customer with social links persists platforms/urls/labels/primary", async ({
    request,
    testData,
  }) => {
    const auth = await loginApi(request, {
      email: testData.user.email,
      password: testData.user.password,
      tenantId: testData.tenant.id,
    });

    const payloadLinks: SocialLinkPayload[] = [
      {
        type: "SOCIAL",
        platform: "linkedin",
        url: "https://www.linkedin.com/in/test-user",
        label: "LinkedIn",
        isPrimary: true,
      },
      {
        type: "SOCIAL",
        platform: "github",
        url: "https://github.com/test-user",
        label: "GitHub",
        isPrimary: false,
      },
    ];

    const createResponse = await createCustomer(request, auth, {
      displayName: `Social Create ${Date.now()}`,
      socialLinks: payloadLinks,
    });
    expect(createResponse.status()).toBe(201);
    const created = parseCustomerPayload(await createResponse.json());

    const getResponse = await getCustomer(request, auth, created.id);
    expect(getResponse.status()).toBe(200);
    const fetched = parseCustomerPayload(await getResponse.json());

    expect(normalizeSocialLinks(fetched.socialLinks ?? [])).toEqual(
      normalizeSocialLinks(payloadLinks)
    );
  });

  test("CASE C: add social link to existing customer", async ({ request, testData }) => {
    const auth = await loginApi(request, {
      email: testData.user.email,
      password: testData.user.password,
      tenantId: testData.tenant.id,
    });

    const createResponse = await createCustomer(request, auth, {
      displayName: `Social Add ${Date.now()}`,
    });
    expect(createResponse.status()).toBe(201);
    const created = parseCustomerPayload(await createResponse.json());

    const addResponse = await updateCustomer(request, auth, created.id, {
      socialLinks: [
        {
          type: "SOCIAL",
          platform: "linkedin",
          url: "https://www.linkedin.com/in/test-user",
          label: "Added Link",
          isPrimary: true,
        },
      ],
    });
    expect(addResponse.status()).toBe(200);

    const getResponse = await getCustomer(request, auth, created.id);
    expect(getResponse.status()).toBe(200);
    const fetched = parseCustomerPayload(await getResponse.json());
    expect(fetched.socialLinks).toEqual([
      {
        type: "SOCIAL",
        platform: "linkedin",
        url: "https://www.linkedin.com/in/test-user",
        label: "Added Link",
        isPrimary: true,
      },
    ]);
  });

  test("CASE D: update existing social link without duplicates", async ({ request, testData }) => {
    const auth = await loginApi(request, {
      email: testData.user.email,
      password: testData.user.password,
      tenantId: testData.tenant.id,
    });

    const createResponse = await createCustomer(request, auth, {
      displayName: `Social Update ${Date.now()}`,
      socialLinks: [
        {
          type: "SOCIAL",
          platform: "linkedin",
          url: "https://www.linkedin.com/in/old-user",
          label: "Old Label",
          isPrimary: true,
        },
      ],
    });
    expect(createResponse.status()).toBe(201);
    const created = parseCustomerPayload(await createResponse.json());

    const updateResponse = await updateCustomer(request, auth, created.id, {
      socialLinks: [
        {
          type: "SOCIAL",
          platform: "linkedin",
          url: "https://www.linkedin.com/in/new-user",
          label: "Updated Label",
          isPrimary: true,
        },
      ],
    });
    expect(updateResponse.status()).toBe(200);

    const getResponse = await getCustomer(request, auth, created.id);
    expect(getResponse.status()).toBe(200);
    const fetched = parseCustomerPayload(await getResponse.json());
    expect(fetched.socialLinks).toHaveLength(1);
    expect(fetched.socialLinks?.[0]).toEqual({
      type: "SOCIAL",
      platform: "linkedin",
      url: "https://www.linkedin.com/in/new-user",
      label: "Updated Label",
      isPrimary: true,
    });
  });

  test("CASE E: remove one social link and keep the other", async ({ request, testData }) => {
    const auth = await loginApi(request, {
      email: testData.user.email,
      password: testData.user.password,
      tenantId: testData.tenant.id,
    });

    const createResponse = await createCustomer(request, auth, {
      displayName: `Social Remove ${Date.now()}`,
      socialLinks: [
        {
          type: "SOCIAL",
          platform: "linkedin",
          url: "https://www.linkedin.com/in/remove-me",
          label: "Remove",
          isPrimary: true,
        },
        {
          type: "SOCIAL",
          platform: "github",
          url: "https://github.com/keep-me",
          label: "Keep",
          isPrimary: false,
        },
      ],
    });
    expect(createResponse.status()).toBe(201);
    const created = parseCustomerPayload(await createResponse.json());

    const updateResponse = await updateCustomer(request, auth, created.id, {
      socialLinks: [
        {
          type: "SOCIAL",
          platform: "github",
          url: "https://github.com/keep-me",
          label: "Keep",
          isPrimary: true,
        },
      ],
    });
    expect(updateResponse.status()).toBe(200);

    const getResponse = await getCustomer(request, auth, created.id);
    expect(getResponse.status()).toBe(200);
    const fetched = parseCustomerPayload(await getResponse.json());
    expect(fetched.socialLinks).toHaveLength(1);
    expect(fetched.socialLinks?.[0]?.platform).toBe("github");
    expect(fetched.socialLinks?.[0]?.url).toBe("https://github.com/keep-me");
  });

  test("CASE F: invalid social link URL is rejected", async ({ request, testData }) => {
    const auth = await loginApi(request, {
      email: testData.user.email,
      password: testData.user.password,
      tenantId: testData.tenant.id,
    });

    const response = await createCustomer(request, auth, {
      displayName: `Social Invalid URL ${Date.now()}`,
      socialLinks: [
        {
          type: "SOCIAL",
          platform: "linkedin",
          url: "not-a-url",
          label: "Bad URL",
          isPrimary: true,
        },
      ],
    });

    expect([400, 422]).toContain(response.status());
    const body = await responseBody(response);
    expect(String(typeof body === "string" ? body : JSON.stringify(body)).toLowerCase()).toContain(
      "url"
    );
  });

  test("CASE G: invalid social platform enum is rejected", async ({ request, testData }) => {
    const auth = await loginApi(request, {
      email: testData.user.email,
      password: testData.user.password,
      tenantId: testData.tenant.id,
    });

    const response = await createCustomer(request, auth, {
      displayName: `Social Invalid Platform ${Date.now()}`,
      socialLinks: [
        {
          type: "SOCIAL",
          platform: "myspace" as never,
          url: "https://example.com/profile",
          label: "Bad Platform",
          isPrimary: true,
        },
      ],
    });

    expect([400, 422]).toContain(response.status());
    const body = await responseBody(response);
    expect(String(typeof body === "string" ? body : JSON.stringify(body)).toLowerCase()).toContain(
      "platform"
    );
  });

  test("CASE H: unauthenticated customer update is rejected with 401", async ({
    request,
    testData,
  }) => {
    const auth = await loginApi(request, {
      email: testData.user.email,
      password: testData.user.password,
      tenantId: testData.tenant.id,
    });

    const createResponse = await createCustomer(request, auth, {
      displayName: `Social Unauth ${Date.now()}`,
    });
    expect(createResponse.status()).toBe(201);
    const created = parseCustomerPayload(await createResponse.json());

    const response = await request.patch(`${API_URL}/customers/${created.id}`, {
      headers: { "Content-Type": "application/json" },
      data: {
        socialLinks: [
          {
            type: "SOCIAL",
            platform: "linkedin",
            url: "https://www.linkedin.com/in/unauth",
            label: "Unauthorized",
            isPrimary: true,
          },
        ],
      },
    });

    expect(response.status()).toBe(401);
  });

  test("CASE I: insufficient permissions cannot update customer social links (403)", async ({
    request,
    testData,
  }) => {
    const auth = await loginApi(request, {
      email: testData.user.email,
      password: testData.user.password,
      tenantId: testData.tenant.id,
    });

    const createResponse = await createCustomer(request, auth, {
      displayName: `Social RBAC ${Date.now()}`,
    });
    expect(createResponse.status()).toBe(201);
    const created = parseCustomerPayload(await createResponse.json());

    const companyWorkspaceId = await createCompanyWorkspace(request, auth);
    const ownerRoleId = await getOwnerRoleId(request, auth, companyWorkspaceId);
    await denyCustomerManagePermission(request, auth, companyWorkspaceId, ownerRoleId);

    const response = await updateCustomer(
      request,
      auth,
      created.id,
      {
        socialLinks: [
          {
            type: "SOCIAL",
            platform: "linkedin",
            url: "https://www.linkedin.com/in/forbidden",
            label: "Forbidden",
            isPrimary: true,
          },
        ],
      },
      companyWorkspaceId
    );

    expect(response.status()).toBe(403);
  });
});
