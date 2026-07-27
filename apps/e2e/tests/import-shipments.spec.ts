import type { APIRequestContext, Page } from "@playwright/test";
import { expect, test } from "./fixtures.ts";
import { selectors } from "../utils/selectors.ts";

const API_URL = process.env.API_URL || "http://localhost:3000";

interface CreateWorkspaceResponse {
  workspace: {
    id: string;
  };
}

interface CustomerResponse {
  id: string;
  displayName: string;
}

interface CreateCatalogItemResponse {
  item: {
    id: string;
    name: string;
    code: string;
    tenantId?: string;
    workspaceId?: string;
  };
}

interface CreateShipmentResponse {
  shipment: {
    id: string;
    status: string;
    supplierPartyId: string;
    lines: Array<{ id: string; productId: string; orderedQty: number }>;
  };
}

interface ListCatalogUomsResponse {
  items: Array<{
    id: string;
    code: string;
    name: string;
  }>;
}

interface ListCatalogTaxProfilesResponse {
  items: Array<{
    id: string;
    name: string;
  }>;
}

interface RolesResponse {
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

interface InventoryLotResponse {
  lot: {
    id: string;
    lotNumber: string;
    unitCostCents: number | null;
  };
}

interface WorkspaceConfigResponse {
  kind: "PERSONAL" | "COMPANY";
  capabilities: Record<string, boolean>;
}

function parseCustomerResponse(body: unknown): CustomerResponse {
  if (typeof body !== "object" || body === null) {
    throw new Error("Invalid customer response");
  }

  const asRecord = body as Record<string, unknown>;
  if (typeof asRecord.id === "string") {
    return {
      id: asRecord.id,
      displayName: String(asRecord.displayName ?? asRecord.id),
    };
  }

  const wrapped = asRecord.customer as Record<string, unknown> | undefined;
  if (wrapped && typeof wrapped.id === "string") {
    return {
      id: wrapped.id,
      displayName: String(wrapped.displayName ?? wrapped.id),
    };
  }

  throw new Error("Customer payload missing id");
}

const todayIso = () => new Date().toISOString().slice(0, 10);

const addDaysIso = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

async function login(
  page: Page,
  creds: {
    email: string;
    password: string;
  }
) {
  await page.goto("/auth/login");
  await page.fill(selectors.auth.loginEmailInput, creds.email);
  await page.fill(selectors.auth.loginPasswordInput, creds.password);
  await page.click(selectors.auth.loginSubmitButton);
  await page.waitForURL("**/dashboard", { timeout: 10_000 });
}

async function getAccessToken(page: Page): Promise<string> {
  const token = await page.evaluate(() => window.localStorage.getItem("accessToken"));
  if (!token) {
    throw new Error("Missing access token after login");
  }
  return token;
}

function authHeaders(accessToken: string, workspaceId?: string): Record<string, string> {
  return {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
    ...(workspaceId ? { "X-Workspace-Id": workspaceId } : {}),
  };
}

function accountingHeaders(workspaceId: string, tenantId: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    "X-Workspace-Id": workspaceId,
    "X-Tenant-Id": tenantId,
  };
}

async function createCompanyWorkspace(page: Page, accessToken: string): Promise<string> {
  const workspaceName = `Import E2E ${Date.now()}`;
  const createResponse = await page.request.post(`${API_URL}/workspaces`, {
    headers: authHeaders(accessToken),
    data: {
      name: workspaceName,
      kind: "COMPANY",
      legalName: workspaceName,
      countryCode: "US",
      currency: "USD",
      address: {
        line1: "100 Import Way",
        city: "Test City",
        postalCode: "10001",
        countryCode: "US",
      },
    },
  });

  expect(createResponse.ok()).toBeTruthy();
  const createBody = (await createResponse.json()) as CreateWorkspaceResponse;
  return createBody.workspace.id;
}

async function switchActiveWorkspace(page: Page, workspaceId: string): Promise<void> {
  await page.goto("/dashboard");
  await page.reload();
  const switcherTrigger = page.locator(selectors.workspace.switcherTrigger).first();
  await expect(switcherTrigger).toBeVisible();
  await switcherTrigger.click();
  await expect(page.locator(selectors.workspace.option(workspaceId))).toBeVisible();
  await page.click(selectors.workspace.option(workspaceId));
}

async function ensureWorkspaceConfig(
  request: APIRequestContext,
  accessToken: string,
  workspaceId: string
): Promise<WorkspaceConfigResponse> {
  const response = await request.get(`${API_URL}/workspaces/${workspaceId}/config?scope=web`, {
    headers: authHeaders(accessToken, workspaceId),
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as WorkspaceConfigResponse;
}

async function ensureCatalogUom(
  request: APIRequestContext,
  accessToken: string,
  workspaceId: string
): Promise<string> {
  const listResponse = await request.get(`${API_URL}/catalog/uoms?page=1&pageSize=100`, {
    headers: authHeaders(accessToken, workspaceId),
  });
  expect(listResponse.ok()).toBeTruthy();
  const listBody = (await listResponse.json()) as ListCatalogUomsResponse;
  if ((listBody.items ?? []).length > 0 && listBody.items[0]) {
    return listBody.items[0].id;
  }

  const suffix = Date.now();
  const createResponse = await request.post(`${API_URL}/catalog/uoms`, {
    headers: authHeaders(accessToken, workspaceId),
    data: {
      code: `PCS${suffix}`,
      name: "Pieces",
    },
  });
  expect(createResponse.ok()).toBeTruthy();
  const created = (await createResponse.json()) as { uom: { id: string } };
  return created.uom.id;
}

async function ensureCatalogTaxProfile(
  request: APIRequestContext,
  accessToken: string,
  workspaceId: string
): Promise<string> {
  const listResponse = await request.get(`${API_URL}/catalog/tax-profiles?page=1&pageSize=50`, {
    headers: authHeaders(accessToken, workspaceId),
  });
  expect(listResponse.ok()).toBeTruthy();
  const listBody = (await listResponse.json()) as ListCatalogTaxProfilesResponse;
  if ((listBody.items ?? []).length > 0 && listBody.items[0]) {
    return listBody.items[0].id;
  }

  const createResponse = await request.post(`${API_URL}/catalog/tax-profiles`, {
    headers: authHeaders(accessToken, workspaceId),
    data: {
      name: `Default VAT ${Date.now()}`,
      vatRateBps: 1900,
      isExciseApplicable: true,
      exciseType: "PERCENT",
      exciseValue: 5,
    },
  });
  expect(createResponse.ok()).toBeTruthy();
  const created = (await createResponse.json()) as { taxProfile: { id: string } };
  return created.taxProfile.id;
}

async function ensureAccountingSetup(
  request: APIRequestContext,
  _accessToken: string,
  workspaceId: string,
  tenantId: string
): Promise<void> {
  const statusResponse = await request.get(
    `${API_URL}/accounting/setup/status?tenantId=${tenantId}&workspaceId=${workspaceId}`,
    {
      headers: accountingHeaders(workspaceId, tenantId),
    }
  );
  expect(statusResponse.ok()).toBeTruthy();
  const status = (await statusResponse.json()) as { isSetup: boolean };
  if (status.isSetup) {
    return;
  }

  const setupResponse = await request.post(
    `${API_URL}/accounting/setup?tenantId=${tenantId}&workspaceId=${workspaceId}`,
    {
      headers: accountingHeaders(workspaceId, tenantId),
      data: {
        baseCurrency: "EUR",
        fiscalYearStartMonthDay: "01-01",
        periodLockingEnabled: false,
        entryNumberPrefix: "JE",
        template: "standard",
      },
    }
  );
  expect(setupResponse.ok()).toBeTruthy();
}

async function getOwnerRoleId(
  request: APIRequestContext,
  accessToken: string,
  workspaceId: string
): Promise<string> {
  const rolesResponse = await request.get(`${API_URL}/identity/roles`, {
    headers: authHeaders(accessToken, workspaceId),
  });
  expect(rolesResponse.ok()).toBeTruthy();
  const rolesBody = (await rolesResponse.json()) as RolesResponse;
  const ownerRole = rolesBody.roles.find((role) => role.systemKey === "OWNER");
  if (!ownerRole) {
    throw new Error("OWNER role not found");
  }
  return ownerRole.id;
}

async function setRolePermissions(
  request: APIRequestContext,
  accessToken: string,
  workspaceId: string,
  roleId: string,
  grants: Array<{ key: string; effect: "ALLOW" | "DENY" }>
): Promise<void> {
  const response = await request.put(`${API_URL}/identity/roles/${roleId}/permissions`, {
    headers: authHeaders(accessToken, workspaceId),
    data: { grants },
  });
  expect(response.ok()).toBeTruthy();
}

async function listGrantedRolePermissions(
  request: APIRequestContext,
  accessToken: string,
  workspaceId: string,
  roleId: string
): Promise<Array<{ key: string; effect: "ALLOW" | "DENY" }>> {
  const response = await request.get(`${API_URL}/identity/roles/${roleId}/permissions`, {
    headers: authHeaders(accessToken, workspaceId),
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

test.describe("Import Shipments business flow", () => {
  test("Use Case 0: capability and permission gating", async ({ page, testData }) => {
    await login(page, { email: testData.user.email, password: testData.user.password });

    // Seeded workspace is PERSONAL (import.basic disabled).
    await page.goto("/dashboard");
    await expect(page.locator('[data-testid="nav-import-shipments"]')).toHaveCount(0);
    await page.goto("/import/shipments/new");
    await expect(
      page
        .getByText(/Import features aren't enabled for this workspace\./i)
        .or(page.getByRole("heading", { name: "404" }))
    ).toBeVisible();

    // Create and switch to COMPANY workspace where import.basic is enabled by template.
    const accessToken = await getAccessToken(page);
    const companyWorkspaceId = await createCompanyWorkspace(page, accessToken);
    await switchActiveWorkspace(page, companyWorkspaceId);
    const config = await ensureWorkspaceConfig(page.request, accessToken, companyWorkspaceId);
    expect(config.kind).toBe("COMPANY");
    expect(config.capabilities["import.basic"]).toBeTruthy();

    await page.goto("/dashboard");
    await page.reload();
    await expect(page.locator('[data-testid="nav-import-shipments"]').first()).toBeVisible();

    // Revoke shipments read permission and verify route is blocked.
    const ownerRoleId = await getOwnerRoleId(page.request, accessToken, companyWorkspaceId);
    const grants = await listGrantedRolePermissions(
      page.request,
      accessToken,
      companyWorkspaceId,
      ownerRoleId
    );

    await setRolePermissions(
      page.request,
      accessToken,
      companyWorkspaceId,
      ownerRoleId,
      grants.filter((grant) => grant.key !== "import.shipments.read")
    );

    await page.goto("/import/shipments");
    await expect(page.getByRole("heading", { name: "404" })).toBeVisible();
  });

  test("Use Cases 1-9: create references, shipment, lots, FEFO, COGS, VAT/excise, monthly pack", async ({
    page,
    testData,
  }) => {
    await login(page, { email: testData.user.email, password: testData.user.password });

    const accessToken = await getAccessToken(page);
    const companyWorkspaceId = await createCompanyWorkspace(page, accessToken);
    await switchActiveWorkspace(page, companyWorkspaceId);
    const workspaceConfig = await ensureWorkspaceConfig(
      page.request,
      accessToken,
      companyWorkspaceId
    );
    expect(workspaceConfig.kind).toBe("COMPANY");
    expect(workspaceConfig.capabilities["import.basic"]).toBeTruthy();
    expect(workspaceConfig.capabilities["catalog.basic"]).toBeTruthy();

    const defaultUomId = await ensureCatalogUom(page.request, accessToken, companyWorkspaceId);
    const taxProfileId = await ensureCatalogTaxProfile(
      page.request,
      accessToken,
      companyWorkspaceId
    );

    const suffix = Date.now();
    const supplierName = `Supplier A ${suffix}`;
    const productName = `Product X ${suffix}`;
    const productCode = `PROD-X-${suffix}`;

    // Use Case 1: Create supplier via UI.
    await page.goto("/suppliers/new");
    await expect(page.getByRole("heading", { name: "Create Supplier" })).toBeVisible();
    await page.fill(selectors.customers.displayNameInput, supplierName);

    const createSupplierResponsePromise = page.waitForResponse(
      (response) => response.url().includes("/customers") && response.request().method() === "POST"
    );
    await page.getByRole("button", { name: "Create Supplier" }).click();

    const createSupplierResponse = await createSupplierResponsePromise;
    expect(createSupplierResponse.ok()).toBeTruthy();
    const supplier = parseCustomerResponse(await createSupplierResponse.json());

    // Use Case 1: Create product.
    const createProductResponse = await page.request.post(`${API_URL}/catalog/items`, {
      headers: authHeaders(accessToken, companyWorkspaceId),
      data: {
        code: productCode,
        name: productName,
        type: "PRODUCT",
        defaultUomId,
        taxProfileId,
        hsCode: "2203.00",
        requiresLotTracking: true,
        requiresExpiryDate: true,
      },
    });
    expect(createProductResponse.ok()).toBeTruthy();
    const product = (await createProductResponse.json()) as CreateCatalogItemResponse;

    // Use Case 2: Create draft shipment via UI.
    await page.goto("/import/shipments/new");
    await expect(page.getByRole("heading", { name: "Create Shipment" })).toBeVisible();

    await page.locator("#supplierPartyId").selectOption(supplier.id);
    await page.getByLabel("Shipping mode").selectOption("SEA");
    await page.getByLabel("Container number").fill(`CONT-${suffix}`);
    await page.getByLabel("Bill of Lading / AWB number").fill(`BOL-${suffix}`);
    await page.getByLabel("Actual arrival date").fill(todayIso());
    await page.getByLabel("FOB value").fill("1200");
    await page.getByLabel("Freight").fill("300");
    await page.getByLabel("Duties").fill("120");
    await page.getByLabel("Taxes").fill("80");

    await page.getByRole("button", { name: "Add line" }).click();
    await page.locator("select").nth(2).selectOption(product.item.id);
    await page.fill('input[name="lines.0.orderedQty"]', "100");
    await page.fill('input[name="lines.0.hsCode"]', "2203.00");
    await page.fill('input[name="lines.0.unitFobCost"]', "10");

    const createShipmentResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/import/shipments") && response.request().method() === "POST"
    );
    await page.getByRole("button", { name: "Create Draft" }).click();

    const createShipmentResponse = await createShipmentResponsePromise;
    expect(createShipmentResponse.ok()).toBeTruthy();
    const shipment = (await createShipmentResponse.json()) as CreateShipmentResponse;

    await expect(page).toHaveURL(/\/import\/shipments\/[a-zA-Z0-9-]+$/);
    await expect(page.getByText(/^DRAFT$/).first()).toBeVisible();

    // Use Case 3: Submit shipment.
    const submitResponse = await page.request.post(
      `${API_URL}/import/shipments/${shipment.shipment.id}/submit`,
      {
        headers: authHeaders(accessToken, companyWorkspaceId),
        data: {},
      }
    );
    expect(submitResponse.ok()).toBeTruthy();

    // Receive shipment through API to move into RECEIVED state.
    const receiveResponse = await page.request.post(
      `${API_URL}/import/shipments/${shipment.shipment.id}/receive`,
      {
        headers: authHeaders(accessToken, companyWorkspaceId),
        data: {
          receivedDate: todayIso(),
          lines: shipment.shipment.lines.map((line) => ({
            lineId: line.id,
            receivedQty: line.orderedQty,
          })),
        },
      }
    );
    expect(receiveResponse.ok()).toBeTruthy();

    await page.goto(`/import/shipments/${shipment.shipment.id}`);
    await expect(page.getByText(/^RECEIVED$/).first()).toBeVisible();

    // Use Case 4: Create lot with expiry and shipment linkage.
    const lotOneExpiry = addDaysIso(180);
    const createLotOneResponse = await page.request.post(`${API_URL}/inventory/lots`, {
      headers: authHeaders(accessToken, companyWorkspaceId),
      data: {
        productId: product.item.id,
        lotNumber: "LOT-001",
        receivedDate: todayIso(),
        expiryDate: lotOneExpiry,
        shipmentId: shipment.shipment.id,
        supplierPartyId: supplier.id,
        qtyReceived: 100,
      },
    });
    expect(createLotOneResponse.ok()).toBeTruthy();

    await page.goto("/inventory/lots");
    await expect(page.getByText("LOT-001")).toBeVisible();
    await expect(page.getByText(new Date(lotOneExpiry).toLocaleDateString())).toBeVisible();

    // Use Case 5: Allocate landed costs and verify lot unit cost updates.
    await page.goto(`/import/shipments/${shipment.shipment.id}`);
    const allocateResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes(`/import/shipments/${shipment.shipment.id}/allocate-costs`) &&
        response.request().method() === "POST"
    );
    await page.getByRole("button", { name: "Allocate Costs" }).click();
    const allocateResponse = await allocateResponsePromise;
    expect(allocateResponse.ok()).toBeTruthy();

    const shipmentAfterAllocationResponse = await page.request.get(
      `${API_URL}/import/shipments/${shipment.shipment.id}`,
      {
        headers: authHeaders(accessToken, companyWorkspaceId),
      }
    );
    expect(shipmentAfterAllocationResponse.ok()).toBeTruthy();
    const shipmentAfterAllocation = (await shipmentAfterAllocationResponse.json()) as {
      shipment: {
        lines: Array<{ unitLandedCostCents: number | null }>;
      };
    };

    const allocatedUnitCost = shipmentAfterAllocation.shipment.lines[0]?.unitLandedCostCents ?? 0;
    expect(allocatedUnitCost).toBeGreaterThan(0);

    const lotsAfterAllocationResponse = await page.request.get(
      `${API_URL}/inventory/lots?shipmentId=${shipment.shipment.id}`,
      {
        headers: authHeaders(accessToken, companyWorkspaceId),
      }
    );
    expect(lotsAfterAllocationResponse.ok()).toBeTruthy();
    const lotsAfterAllocation = (await lotsAfterAllocationResponse.json()) as {
      lots: Array<{ id: string; unitCostCents: number | null }>;
    };
    const lotOneAfterAllocation = lotsAfterAllocation.lots[0];
    expect(lotOneAfterAllocation?.unitCostCents ?? 0).toBe(allocatedUnitCost);

    // Retry allocation to verify idempotent cost outcome.
    const allocateRetryResponse = await page.request.post(
      `${API_URL}/import/shipments/${shipment.shipment.id}/allocate-costs`,
      {
        headers: authHeaders(accessToken, companyWorkspaceId),
        data: { allocationMethod: "BY_FOB_VALUE" },
      }
    );
    expect(allocateRetryResponse.ok()).toBeTruthy();

    const lotsAfterRetryResponse = await page.request.get(
      `${API_URL}/inventory/lots?shipmentId=${shipment.shipment.id}`,
      {
        headers: authHeaders(accessToken, companyWorkspaceId),
      }
    );
    const lotsAfterRetry = (await lotsAfterRetryResponse.json()) as {
      lots: Array<{ id: string; unitCostCents: number | null }>;
    };
    expect(lotsAfterRetry.lots[0]?.unitCostCents ?? 0).toBe(allocatedUnitCost);

    // Use Case 6: FEFO picks earliest-expiry lot first.
    const createLotTwoResponse = await page.request.post(`${API_URL}/inventory/lots`, {
      headers: authHeaders(accessToken, companyWorkspaceId),
      data: {
        productId: product.item.id,
        lotNumber: "LOT-002",
        receivedDate: todayIso(),
        expiryDate: addDaysIso(260),
        shipmentId: shipment.shipment.id,
        supplierPartyId: supplier.id,
        unitCostCents: allocatedUnitCost,
        qtyReceived: 100,
      },
    });
    expect(createLotTwoResponse.ok()).toBeTruthy();

    const pickResponse = await page.request.post(`${API_URL}/inventory/pick/fefo`, {
      headers: authHeaders(accessToken, companyWorkspaceId),
      data: {
        warehouseId: "default",
        strategy: "FEFO",
        lines: [{ productId: product.item.id, quantityRequested: 10 }],
      },
    });
    expect(pickResponse.ok()).toBeTruthy();
    const pickBody = (await pickResponse.json()) as {
      picks: Array<{ allocations: Array<{ lotNumber: string }>; shortfall: number }>;
      allocationSuccessful: boolean;
    };
    expect(pickBody.allocationSuccessful).toBeTruthy();
    expect(pickBody.picks[0]?.allocations[0]?.lotNumber).toBe("LOT-001");
    expect(pickBody.picks[0]?.shortfall ?? 1).toBe(0);

    // Expired-only product should be blocked from FEFO allocation.
    const expiredProductId = `expired-${suffix}`;
    const createExpiredLotResponse = await page.request.post(`${API_URL}/inventory/lots`, {
      headers: authHeaders(accessToken, companyWorkspaceId),
      data: {
        productId: expiredProductId,
        lotNumber: "LOT-EXP-001",
        receivedDate: todayIso(),
        expiryDate: addDaysIso(-2),
        qtyReceived: 5,
      },
    });
    expect(createExpiredLotResponse.ok()).toBeTruthy();

    const expiredPickResponse = await page.request.post(`${API_URL}/inventory/pick/fefo`, {
      headers: authHeaders(accessToken, companyWorkspaceId),
      data: {
        warehouseId: "default",
        strategy: "FEFO",
        lines: [{ productId: expiredProductId, quantityRequested: 1 }],
      },
    });
    expect(expiredPickResponse.ok()).toBeTruthy();
    const expiredPickBody = (await expiredPickResponse.json()) as {
      picks: Array<{ quantityAllocated: number; shortfall: number }>;
      allocationSuccessful: boolean;
    };
    expect(expiredPickBody.allocationSuccessful).toBeFalsy();
    expect(expiredPickBody.picks[0]?.quantityAllocated ?? 1).toBe(0);
    expect(expiredPickBody.picks[0]?.shortfall ?? 0).toBe(1);

    // Use Case 7: Finalize invoice posts one COGS journal entry.
    const accountingTenantId = product.item.tenantId ?? companyWorkspaceId;
    await ensureAccountingSetup(page.request, accessToken, companyWorkspaceId, accountingTenantId);

    const customerResponse = await page.request.post(`${API_URL}/customers`, {
      headers: authHeaders(accessToken, companyWorkspaceId),
      data: {
        displayName: `Customer ${suffix}`,
        role: "CUSTOMER",
      },
    });
    expect(customerResponse.ok()).toBeTruthy();
    const customer = parseCustomerResponse(await customerResponse.json());

    const createInvoiceResponse = await page.request.post(`${API_URL}/invoices`, {
      headers: authHeaders(accessToken, companyWorkspaceId),
      data: {
        customerPartyId: customer.id,
        currency: "EUR",
        lineItems: [{ description: `[product:${product.item.id}]`, qty: 10, unitPriceCents: 5000 }],
      },
    });
    expect(createInvoiceResponse.ok()).toBeTruthy();
    const createdInvoice = (await createInvoiceResponse.json()) as {
      id: string;
      number?: string | null;
    };

    const finalizeInvoiceResponse = await page.request.post(
      `${API_URL}/invoices/${createdInvoice.id}/finalize`,
      {
        headers: authHeaders(accessToken, companyWorkspaceId),
        data: {},
      }
    );
    expect(finalizeInvoiceResponse.ok()).toBeTruthy();

    const journalEntriesResponse = await page.request.get(
      `${API_URL}/accounting/journal-entries?tenantId=${accountingTenantId}&workspaceId=${companyWorkspaceId}`,
      {
        headers: accountingHeaders(companyWorkspaceId, accountingTenantId),
      }
    );
    expect(journalEntriesResponse.ok()).toBeTruthy();
    const journalEntriesBody = (await journalEntriesResponse.json()) as {
      entries: Array<{
        id: string;
        sourceId: string | null;
        lines: Array<{ direction: "Debit" | "Credit"; amountCents: number }>;
      }>;
    };

    const cogsEntries = journalEntriesBody.entries.filter(
      (entry) => entry.sourceId === createdInvoice.id
    );
    expect(cogsEntries).toHaveLength(1);

    const expectedCogs = 10 * allocatedUnitCost;
    const debitAmount = cogsEntries[0]?.lines
      .filter((line) => line.direction === "Debit")
      .reduce((sum, line) => sum + line.amountCents, 0);
    const creditAmount = cogsEntries[0]?.lines
      .filter((line) => line.direction === "Credit")
      .reduce((sum, line) => sum + line.amountCents, 0);

    expect(debitAmount).toBe(expectedCogs);
    expect(creditAmount).toBe(expectedCogs);

    const finalizeRetryResponse = await page.request.post(
      `${API_URL}/invoices/${createdInvoice.id}/finalize`,
      {
        headers: authHeaders(accessToken, companyWorkspaceId),
        data: {},
      }
    );
    expect(finalizeRetryResponse.ok()).toBeFalsy();

    const journalEntriesAfterRetryResponse = await page.request.get(
      `${API_URL}/accounting/journal-entries?tenantId=${accountingTenantId}&workspaceId=${companyWorkspaceId}`,
      {
        headers: accountingHeaders(companyWorkspaceId, accountingTenantId),
      }
    );
    const journalEntriesAfterRetry = (await journalEntriesAfterRetryResponse.json()) as {
      entries: Array<{ sourceId: string | null }>;
    };
    expect(
      journalEntriesAfterRetry.entries.filter((entry) => entry.sourceId === createdInvoice.id)
    ).toHaveLength(1);

    // Use Case 8: VAT period summary and excise monthly report.
    const currentYear = new Date().getUTCFullYear();
    const vatPeriodsResponse = await page.request.get(
      `${API_URL}/tax/periods?year=${currentYear}`,
      {
        headers: authHeaders(accessToken, companyWorkspaceId),
      }
    );
    expect(vatPeriodsResponse.ok()).toBeTruthy();
    const vatPeriodsBody = (await vatPeriodsResponse.json()) as {
      periods: Array<{ periodKey: string; salesVatCents: number }>;
    };
    expect(vatPeriodsBody.periods.length).toBeGreaterThan(0);

    const exciseReportResponse = await page.request.post(`${API_URL}/tax/excise-reports/generate`, {
      headers: authHeaders(accessToken, companyWorkspaceId),
      data: {
        periodStart: new Date(
          new Date().getUTCFullYear(),
          new Date().getUTCMonth(),
          1
        ).toISOString(),
        periodEnd: new Date(
          new Date().getUTCFullYear(),
          new Date().getUTCMonth() + 1,
          1
        ).toISOString(),
        currency: "EUR",
      },
    });
    expect(exciseReportResponse.ok()).toBeTruthy();
    const exciseReportBody = (await exciseReportResponse.json()) as {
      report: { amountFinalCents: number | null; lines?: Array<unknown> };
    };
    expect(exciseReportBody.report.amountFinalCents ?? 0).toBeGreaterThanOrEqual(0);
    expect(Array.isArray(exciseReportBody.report.lines ?? [])).toBeTruthy();

    // Use Case 9: Monthly pack report includes key sections.
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);

    const monthEnd = new Date(monthStart);
    monthEnd.setUTCMonth(monthEnd.getUTCMonth() + 1);

    const monthlyPackResponse = await page.request.get(
      `${API_URL}/reports/monthly-pack?periodStart=${encodeURIComponent(monthStart.toISOString())}&periodEnd=${encodeURIComponent(monthEnd.toISOString())}&currency=EUR`,
      {
        headers: authHeaders(accessToken, companyWorkspaceId),
      }
    );
    expect(monthlyPackResponse.ok()).toBeTruthy();
    const monthlyPackBody = (await monthlyPackResponse.json()) as {
      report: {
        plSummary: unknown;
        vatSummary: unknown;
        exciseSummary: unknown;
        inventoryBalance: unknown;
        expiryAlerts: unknown;
        importActivity: { shipmentsReceived: number };
      };
    };

    expect(monthlyPackBody.report.plSummary).toBeTruthy();
    expect(monthlyPackBody.report.vatSummary).toBeTruthy();
    expect(monthlyPackBody.report.exciseSummary).toBeTruthy();
    expect(monthlyPackBody.report.inventoryBalance).toBeTruthy();
    expect(monthlyPackBody.report.expiryAlerts).toBeTruthy();
    expect(monthlyPackBody.report.importActivity.shipmentsReceived).toBeGreaterThanOrEqual(1);
  });

  test("Use Case 2 empty-state path: create supplier and product inside shipment form", async ({
    page,
    testData,
  }) => {
    await login(page, { email: testData.user.email, password: testData.user.password });

    const accessToken = await getAccessToken(page);
    const companyWorkspaceId = await createCompanyWorkspace(page, accessToken);
    await switchActiveWorkspace(page, companyWorkspaceId);
    const workspaceConfig = await ensureWorkspaceConfig(
      page.request,
      accessToken,
      companyWorkspaceId
    );
    expect(workspaceConfig.kind).toBe("COMPANY");
    expect(workspaceConfig.capabilities["import.basic"]).toBeTruthy();
    expect(workspaceConfig.capabilities["catalog.basic"]).toBeTruthy();
    await ensureCatalogUom(page.request, accessToken, companyWorkspaceId);

    const supplierName = `Quick Supplier ${Date.now()}`;
    const productName = `Quick Product ${Date.now()}`;
    const productCode = `QP-${Date.now()}`;

    await page.goto("/import/shipments/new");
    await expect(page.getByText("No suppliers found.")).toBeVisible();
    await expect(page.getByText("No products found.").first()).toBeVisible();

    const createSupplierResponsePromise = page.waitForResponse(
      (response) => response.url().includes("/customers") && response.request().method() === "POST"
    );
    await page.getByRole("button", { name: "Create supplier" }).first().click();
    await page.getByLabel("Supplier name").fill(supplierName);
    await page.getByRole("dialog").getByRole("button", { name: "Create supplier" }).click();

    const createSupplierResponse = await createSupplierResponsePromise;
    expect(createSupplierResponse.ok()).toBeTruthy();
    const createdSupplier = parseCustomerResponse(await createSupplierResponse.json());
    await expect(page.locator("#supplierPartyId")).toHaveValue(createdSupplier.id);

    await page.getByRole("button", { name: "Add line" }).click();

    const createProductResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/catalog/items") && response.request().method() === "POST"
    );
    await page.getByRole("button", { name: "Create product" }).first().click();
    await page.getByLabel("Product name").fill(productName);
    await page.getByLabel("SKU / Code").fill(productCode);
    await page.getByRole("dialog").getByRole("button", { name: "Create product" }).click();

    const createProductResponse = await createProductResponsePromise;
    expect(createProductResponse.ok()).toBeTruthy();
    const createdProduct = (await createProductResponse.json()) as CreateCatalogItemResponse;

    await page.fill('input[name="lines.0.orderedQty"]', "5");

    const createShipmentResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes("/import/shipments") && response.request().method() === "POST"
    );
    await page.getByRole("button", { name: "Create Draft" }).click();

    const createShipmentResponse = await createShipmentResponsePromise;
    expect(createShipmentResponse.ok()).toBeTruthy();

    const createShipmentRequest = createShipmentResponse.request().postDataJSON() as {
      supplierPartyId: string;
      lines: Array<{ productId: string; orderedQty: number }>;
    };
    expect(createShipmentRequest.supplierPartyId).toBe(createdSupplier.id);
    expect(createShipmentRequest.lines[0]?.productId).toBe(createdProduct.item.id);
    expect(createShipmentRequest.lines[0]?.orderedQty).toBe(5);
  });
});
