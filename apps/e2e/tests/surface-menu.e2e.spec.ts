import type { APIRequestContext, Page, TestInfo } from "@playwright/test";
import { expect, test } from "./fixtures.ts";
import { selectors } from "../utils/selectors.ts";
import {
  buildAuthHeaders,
  loginAsSeededUser,
  type AuthContext,
  type SeededTestData,
} from "./helpers/auth.ts";
import { HttpClient } from "./helpers/http-client.ts";
import { idempotencyKey } from "./helpers/idempotency.ts";
import {
  buildSurfaceWebUrl,
  forwardedHostForSurface,
  installSurfaceApiForwarding,
  type TestSurface,
} from "./helpers/surface.ts";

const API_URL = process.env.API_URL ?? "http://localhost:3000";

interface WorkspaceConfigResponse {
  surfaceId: TestSurface | "shared";
  kind: "PERSONAL" | "COMPANY";
  capabilities: Record<string, boolean>;
  navigation: {
    groups: Array<{
      appId: string;
      items: Array<{ id: string }>;
    }>;
  };
}

interface CreateWorkspaceResponse {
  workspace: {
    id: string;
  };
}

interface RoleListResponse {
  roles: Array<{
    id: string;
    systemKey: string | null;
    name: string;
  }>;
}

interface RolePermissionsResponse {
  grants: Array<{
    key: string;
    granted: boolean;
    effect?: "ALLOW" | "DENY";
  }>;
}

interface HostAdminAuthContext {
  accessToken: string;
}

function jsonHeaders(
  auth: AuthContext,
  workspaceId?: string,
  extraHeaders?: Record<string, string>
): Record<string, string> {
  return {
    ...buildAuthHeaders(auth, workspaceId ? { workspaceId } : undefined),
    "Content-Type": "application/json",
    ...(extraHeaders ?? {}),
  };
}

function hostAdminHeaders(
  auth: HostAdminAuthContext,
  extraHeaders?: Record<string, string>
): Record<string, string> {
  return {
    Authorization: `Bearer ${auth.accessToken}`,
    "Content-Type": "application/json",
    ...(extraHeaders ?? {}),
  };
}

function navigationItemIds(config: WorkspaceConfigResponse): Set<string> {
  return new Set(config.navigation.groups.flatMap((group) => group.items.map((item) => item.id)));
}

function navigationGroupIds(config: WorkspaceConfigResponse): Set<string> {
  return new Set(config.navigation.groups.map((group) => group.appId));
}

async function createAuthenticatedClient(
  request: APIRequestContext,
  testData: SeededTestData
): Promise<{ auth: AuthContext; client: HttpClient }> {
  const auth = await loginAsSeededUser(request, testData);
  return {
    auth,
    client: new HttpClient(request, auth),
  };
}

async function loginAsHostAdmin(
  request: APIRequestContext,
  hostAdminData: SeededTestData
): Promise<HostAdminAuthContext> {
  const response = await request.post(`${API_URL}/auth/login`, {
    headers: {
      "Content-Type": "application/json",
    },
    data: {
      email: hostAdminData.user.email,
      password: hostAdminData.user.password,
    },
  });

  expect(response.ok()).toBeTruthy();
  const body = (await response.json()) as { accessToken?: string };
  expect(typeof body.accessToken).toBe("string");

  return {
    accessToken: String(body.accessToken),
  };
}

async function setTenantAppEnabled(
  request: APIRequestContext,
  hostAdminAuth: HostAdminAuthContext,
  tenantId: string,
  testInfo: TestInfo,
  appId: string,
  enabled: boolean
): Promise<void> {
  const response = await request.patch(`${API_URL}/platform/tenants/${tenantId}/apps/${appId}`, {
    headers: hostAdminHeaders(hostAdminAuth, {
      "x-idempotency-key": idempotencyKey(testInfo, `${enabled ? "enable" : "disable"}-${appId}`),
    }),
    data: {
      enabled,
      cascade: true,
    },
  });

  expect(response.ok()).toBeTruthy();
}

async function enableApps(
  request: APIRequestContext,
  hostAdminAuth: HostAdminAuthContext,
  tenantId: string,
  testInfo: TestInfo,
  appIds: readonly string[]
): Promise<void> {
  for (const appId of appIds) {
    await setTenantAppEnabled(request, hostAdminAuth, tenantId, testInfo, appId, true);
  }
}

async function fetchWorkspaceConfig(
  client: HttpClient,
  workspaceId: string,
  surface: TestSurface | string
): Promise<WorkspaceConfigResponse> {
  const host =
    surface === "platform" || surface === "pos" || surface === "crm"
      ? forwardedHostForSurface(surface)
      : surface;

  const { response, body } = await client.getJson(`/workspaces/${workspaceId}/config`, {
    query: { scope: "web" },
    scope: { workspaceId },
    headers: { "x-forwarded-host": host },
  });

  expect(response.ok()).toBeTruthy();
  return body as WorkspaceConfigResponse;
}

async function createCompanyWorkspace(
  request: APIRequestContext,
  auth: AuthContext
): Promise<string> {
  const response = await request.post(`${API_URL}/workspaces`, {
    headers: jsonHeaders(auth),
    data: {
      name: `Surface Company ${Date.now()}`,
      kind: "COMPANY",
      legalName: "Surface Company GmbH",
      countryCode: "DE",
      currency: "EUR",
      address: {
        line1: "Surface Street 1",
        city: "Berlin",
        postalCode: "10115",
        countryCode: "DE",
      },
    },
  });

  expect(response.ok()).toBeTruthy();
  const body = (await response.json()) as CreateWorkspaceResponse;
  expect(body.workspace.id).toBeTruthy();
  return body.workspace.id;
}

async function getOwnerRoleId(
  request: APIRequestContext,
  auth: AuthContext,
  workspaceId: string
): Promise<string> {
  const response = await request.get(`${API_URL}/identity/roles`, {
    headers: jsonHeaders(auth, workspaceId),
  });

  expect(response.ok()).toBeTruthy();
  const body = (await response.json()) as RoleListResponse;
  const ownerRole = body.roles.find((role) => role.systemKey === "OWNER");

  if (!ownerRole) {
    throw new Error("OWNER role not found");
  }

  return ownerRole.id;
}

async function listGrantedRolePermissions(
  request: APIRequestContext,
  auth: AuthContext,
  workspaceId: string,
  roleId: string
): Promise<Array<{ key: string; effect: "ALLOW" | "DENY" }>> {
  const response = await request.get(`${API_URL}/identity/roles/${roleId}/permissions`, {
    headers: jsonHeaders(auth, workspaceId),
  });

  expect(response.ok()).toBeTruthy();
  const body = (await response.json()) as RolePermissionsResponse;

  return body.grants
    .filter((grant) => grant.granted)
    .map((grant) => ({
      key: grant.key,
      effect: grant.effect ?? "ALLOW",
    }));
}

async function setRolePermissions(
  request: APIRequestContext,
  auth: AuthContext,
  workspaceId: string,
  roleId: string,
  grants: Array<{ key: string; effect: "ALLOW" | "DENY" }>
): Promise<void> {
  const response = await request.put(`${API_URL}/identity/roles/${roleId}/permissions`, {
    headers: jsonHeaders(auth, workspaceId),
    data: { grants },
  });

  expect(response.ok()).toBeTruthy();
}

async function loginOnSurface(
  page: Page,
  testData: SeededTestData,
  surface: TestSurface
): Promise<void> {
  const loginUrl = buildSurfaceWebUrl(
    surface,
    `/auth/login?tenant=${encodeURIComponent(testData.tenant.id)}`
  );

  await page.goto(loginUrl);
  await page.fill(selectors.auth.loginEmailInput, testData.user.email);
  await page.fill(selectors.auth.loginPasswordInput, testData.user.password);
  await page.click(selectors.auth.loginSubmitButton);

  const expectedPath =
    surface === "crm" ? /\/crm$/ : surface === "pos" ? /\/restaurant\/floor-plan$/ : /\/dashboard$/;

  await page.waitForURL(expectedPath, { timeout: 20_000 });
  await expect(page.locator(selectors.navigation.sidebarNav)).toBeVisible({ timeout: 20_000 });
}

test.describe("Surface-aware menu E2E", () => {
  test.describe.configure({ mode: "serial" });

  test("workspace config is surface-aware and stays separated across POS and CRM", async ({
    request,
    testData,
    hostAdminData,
  }, testInfo) => {
    const { auth, client } = await createAuthenticatedClient(request, testData);
    const hostAdminAuth = await loginAsHostAdmin(request, hostAdminData);
    await enableApps(request, hostAdminAuth, testData.tenant.id, testInfo, ["crm"]);

    const posConfig = await fetchWorkspaceConfig(client, auth.workspaceId, "pos");
    const crmConfig = await fetchWorkspaceConfig(client, auth.workspaceId, "crm");
    const posAgain = await fetchWorkspaceConfig(client, auth.workspaceId, "pos");

    const posItemIds = navigationItemIds(posConfig);
    const crmItemIds = navigationItemIds(crmConfig);

    expect(posConfig.surfaceId).toBe("pos");
    expect(crmConfig.surfaceId).toBe("crm");

    expect(posItemIds.has("crm-dashboard")).toBe(false);

    expect(crmItemIds.has("crm-dashboard")).toBe(true);
    expect(crmItemIds.has("crm-deals")).toBe(true);
    expect(posItemIds).not.toEqual(crmItemIds);

    expect(navigationItemIds(posAgain)).toEqual(posItemIds);
    expect(navigationGroupIds(posAgain)).toEqual(navigationGroupIds(posConfig));
  });

  test("tenant app entitlements still remove CRM navigation inside the CRM surface", async ({
    request,
    testData,
    hostAdminData,
  }, testInfo) => {
    const { auth, client } = await createAuthenticatedClient(request, testData);
    const hostAdminAuth = await loginAsHostAdmin(request, hostAdminData);
    await enableApps(request, hostAdminAuth, testData.tenant.id, testInfo, ["crm"]);

    const enabledConfig = await fetchWorkspaceConfig(client, auth.workspaceId, "crm");
    expect(navigationItemIds(enabledConfig).has("crm-dashboard")).toBe(true);

    await setTenantAppEnabled(request, hostAdminAuth, testData.tenant.id, testInfo, "crm", false);

    const disabledConfig = await fetchWorkspaceConfig(client, auth.workspaceId, "crm");
    const itemIds = navigationItemIds(disabledConfig);

    expect(itemIds.has("crm-dashboard")).toBe(false);
    expect(itemIds.has("crm-deals")).toBe(false);
  });

  test("permissions still filter platform menu items and reject direct API access", async ({
    request,
    testData,
  }) => {
    const { auth, client } = await createAuthenticatedClient(request, testData);
    const companyWorkspaceId = await createCompanyWorkspace(request, auth);
    const ownerRoleId = await getOwnerRoleId(request, auth, companyWorkspaceId);
    const granted = await listGrantedRolePermissions(
      request,
      auth,
      companyWorkspaceId,
      ownerRoleId
    );

    await setRolePermissions(
      request,
      auth,
      companyWorkspaceId,
      ownerRoleId,
      granted.filter((grant) => grant.key !== "import.shipments.read")
    );

    const config = await fetchWorkspaceConfig(client, companyWorkspaceId, "platform");
    const itemIds = navigationItemIds(config);

    expect(itemIds.has("import-shipments")).toBe(false);
    expect(itemIds.has("dashboard")).toBe(true);

    const shipmentsResponse = await request.get(`${API_URL}/import/shipments`, {
      headers: jsonHeaders(auth, companyWorkspaceId, {
        "x-forwarded-host": forwardedHostForSurface("platform"),
      }),
    });

    expect(shipmentsResponse.status()).toBe(403);
  });

  test("default or unknown hosts fall back to the platform surface explicitly", async ({
    request,
    testData,
  }) => {
    const { auth, client } = await createAuthenticatedClient(request, testData);

    const unknownConfig = await fetchWorkspaceConfig(client, auth.workspaceId, "labs.corely.one");

    expect(unknownConfig.surfaceId).toBe("platform");
    expect(navigationItemIds(unknownConfig).has("dashboard")).toBe(true);
  });

  test("CRM API access is rejected when the request resolves to the POS surface", async ({
    request,
    testData,
    hostAdminData,
  }, testInfo) => {
    const { auth } = await createAuthenticatedClient(request, testData);
    const hostAdminAuth = await loginAsHostAdmin(request, hostAdminData);
    await enableApps(request, hostAdminAuth, testData.tenant.id, testInfo, ["crm"]);

    const response = await request.get(`${API_URL}/crm/leads`, {
      headers: jsonHeaders(auth, auth.workspaceId, {
        "x-forwarded-host": forwardedHostForSurface("pos"),
      }),
    });

    expect(response.status()).toBe(403);
  });

  test("platform capability filtering still applies alongside surface-aware config", async ({
    request,
    testData,
  }) => {
    const { auth, client } = await createAuthenticatedClient(request, testData);

    const personalConfig = await fetchWorkspaceConfig(client, auth.workspaceId, "platform");
    expect(personalConfig.kind).toBe("PERSONAL");
    expect(navigationItemIds(personalConfig).has("import-shipments")).toBe(false);

    const companyWorkspaceId = await createCompanyWorkspace(request, auth);
    const companyConfig = await fetchWorkspaceConfig(client, companyWorkspaceId, "platform");

    expect(companyConfig.kind).toBe("COMPANY");
    expect(companyConfig.capabilities["import.basic"]).toBe(true);
    expect(navigationItemIds(companyConfig).has("import-shipments")).toBe(true);
  });

  test("CRM browser surface shows CRM navigation and hides POS navigation", async ({
    page,
    request,
    testData,
    hostAdminData,
  }, testInfo) => {
    test.skip(
      process.env.SURFACE_HOST_E2E !== "true",
      "Browser host-based surface tests require a host-aware local web origin such as crm.localhost."
    );

    const hostAdminAuth = await loginAsHostAdmin(request, hostAdminData);
    await enableApps(request, hostAdminAuth, testData.tenant.id, testInfo, ["crm"]);

    await installSurfaceApiForwarding(page, "crm");
    await loginOnSurface(page, testData, "crm");

    await expect(page.getByTestId("nav-crm-dashboard")).toBeVisible();
    await expect(page.getByTestId("nav-crm-deals")).toBeVisible();
    await expect(page.getByTestId("nav-restaurant-floor-plan")).toHaveCount(0);
    await expect(page.getByTestId("nav-cash-management")).toHaveCount(0);
  });

  test("POS browser surface hides CRM navigation and blocks direct CRM navigation", async ({
    page,
    request,
    testData,
    hostAdminData,
  }, testInfo) => {
    test.skip(
      process.env.SURFACE_HOST_E2E !== "true",
      "Browser host-based surface tests require a host-aware local web origin such as pos.localhost."
    );

    const hostAdminAuth = await loginAsHostAdmin(request, hostAdminData);
    await enableApps(request, hostAdminAuth, testData.tenant.id, testInfo, ["crm"]);

    await installSurfaceApiForwarding(page, "pos");
    await loginOnSurface(page, testData, "pos");

    await expect(page.getByTestId("nav-crm-dashboard")).toHaveCount(0);

    await page.goto(buildSurfaceWebUrl("pos", "/crm/deals"));

    await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
    await expect(page.locator(selectors.crm.dealsHeader)).toHaveCount(0);
  });
});
