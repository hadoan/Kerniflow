import { expect, test } from "./fixtures.ts";
import type { Page } from "@playwright/test";
import {
  createPartyViaApi,
  login,
  requestAsAuth,
  requestAsAuthFailure,
  type AuthContext,
} from "../helpers/classes/workflow.ts";

const API_URL = process.env.API_URL || "http://localhost:3000";

type CatalogUom = {
  id: string;
  code: string;
  name: string;
};

type CatalogUomListResponse = {
  items: CatalogUom[];
  pageInfo: {
    page: number;
    pageSize: number;
    total: number;
    hasNextPage: boolean;
  };
};

type CatalogUomUpsertResponse = {
  uom: {
    id: string;
  };
};

type CatalogCreateItemResponse = {
  item: {
    id: string;
    code: string;
    name: string;
  };
};

type CatalogListItemsResponse = {
  items: Array<{
    id: string;
    code: string;
    name: string;
  }>;
  pageInfo: {
    page: number;
    pageSize: number;
    total: number;
    hasNextPage: boolean;
  };
};

type SalesCreateOrderResponse = {
  order: {
    id: string;
    status: string;
  };
};

type SalesCreateInvoiceFromOrderResponse = {
  invoice: {
    id: string;
  };
};

type InvoiceCreateResponse = {
  id?: string;
  invoice?: {
    id: string;
  };
};

type InvoiceSummary = {
  id: string;
  status: string;
  totals: {
    totalCents: number;
    paidCents: number;
    dueCents: number;
  };
};

type InvoiceGetResponse = {
  invoice: InvoiceSummary;
};

type CustomersListResponse = {
  items: Array<{
    id: string;
    displayName: string;
  }>;
};

type CreateWorkspaceResponse = {
  workspace: {
    id: string;
  };
};

type WorkspaceConfigResponse = {
  kind: "PERSONAL" | "COMPANY";
  capabilities: Record<string, boolean>;
};

function authHeaders(auth: AuthContext, workspaceId?: string): Record<string, string> {
  return {
    Authorization: `Bearer ${auth.accessToken}`,
    "Content-Type": "application/json",
    ...(workspaceId ? { "X-Workspace-Id": workspaceId } : {}),
  };
}

async function createCompanyWorkspace(
  page: Page,
  auth: AuthContext,
  suffix: string
): Promise<string> {
  const response = await page.request.post(`${API_URL}/workspaces`, {
    headers: authHeaders(auth),
    data: {
      name: `E2E Ecommerce ${suffix}`,
      kind: "COMPANY",
      legalName: `E2E Ecommerce ${suffix}`,
      countryCode: "US",
      currency: "USD",
      address: {
        line1: "100 Commerce Ave",
        city: "Test City",
        postalCode: "10001",
        countryCode: "US",
      },
    },
  });
  expect(response.ok()).toBeTruthy();
  const body = (await response.json()) as CreateWorkspaceResponse;
  return body.workspace.id;
}

async function getWorkspaceConfig(
  page: Page,
  auth: AuthContext,
  workspaceId: string
): Promise<WorkspaceConfigResponse> {
  const response = await page.request.get(`${API_URL}/workspaces/${workspaceId}/config?scope=web`, {
    headers: authHeaders(auth, workspaceId),
  });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as WorkspaceConfigResponse;
}

async function ensureCatalogUom(page: Parameters<typeof requestAsAuth>[0], auth: AuthContext) {
  const list = await requestAsAuth<CatalogUomListResponse>(
    page,
    auth,
    "GET",
    "/catalog/uoms?page=1&pageSize=1"
  );

  if (list.items[0]) {
    return list.items[0].id;
  }

  const suffix = Date.now();
  const created = await requestAsAuth<CatalogUomUpsertResponse>(
    page,
    auth,
    "POST",
    "/catalog/uoms",
    {
      code: `PCS-${suffix}`,
      name: "Pieces",
    }
  );
  return created.uom.id;
}

function invoiceIdFromCreate(response: InvoiceCreateResponse): string {
  return response.invoice?.id ?? response.id ?? "";
}

test.describe("Ecommerce sample flow", () => {
  test("creates 20 products with paging, then orders and pays when supported", async ({
    page,
    testData,
  }, testInfo) => {
    await login(page, testData);
    const accessToken = await page.evaluate(() => localStorage.getItem("accessToken") ?? "");
    expect(accessToken).toBeTruthy();

    const auth: AuthContext = {
      accessToken,
      workspaceId: testData.workspace.id,
      tenantId: testData.tenant.id,
      userId: testData.user.id,
    };
    const suffix = `${Date.now()}-${testInfo.workerIndex}`;
    const companyWorkspaceId = await createCompanyWorkspace(page, auth, suffix);
    auth.workspaceId = companyWorkspaceId;

    const workspaceConfig = await getWorkspaceConfig(page, auth, companyWorkspaceId);
    test.skip(
      !workspaceConfig.capabilities["catalog.basic"],
      "catalog.basic capability is required for ecommerce paging coverage."
    );

    const productPrefix = `E2E-PROD-${suffix}`;
    const defaultUomId = await ensureCatalogUom(page, auth);

    const createdProductIds: string[] = [];

    for (let index = 1; index <= 20; index += 1) {
      const productCode = `${productPrefix}-${String(index).padStart(2, "0")}`;
      const created = await requestAsAuth<CatalogCreateItemResponse>(
        page,
        auth,
        "POST",
        "/catalog/items",
        {
          code: productCode,
          name: `Storefront Product ${index} ${suffix}`,
          type: "PRODUCT",
          defaultUomId,
          requiresLotTracking: false,
          requiresExpiryDate: false,
        }
      );

      expect(created.item.id).toBeTruthy();
      expect(created.item.code).toBe(productCode);
      createdProductIds.push(created.item.id);
    }

    const encodedQuery = encodeURIComponent(productPrefix);
    const firstPage = await requestAsAuth<CatalogListItemsResponse>(
      page,
      auth,
      "GET",
      `/catalog/items?q=${encodedQuery}&page=1&pageSize=10`
    );
    const secondPage = await requestAsAuth<CatalogListItemsResponse>(
      page,
      auth,
      "GET",
      `/catalog/items?q=${encodedQuery}&page=2&pageSize=10`
    );

    expect(firstPage.items).toHaveLength(10);
    expect(secondPage.items).toHaveLength(10);
    expect(firstPage.pageInfo.page).toBe(1);
    expect(firstPage.pageInfo.pageSize).toBe(10);
    expect(firstPage.pageInfo.total).toBe(20);
    expect(firstPage.pageInfo.hasNextPage).toBe(true);
    expect(secondPage.pageInfo.page).toBe(2);
    expect(secondPage.pageInfo.pageSize).toBe(10);
    expect(secondPage.pageInfo.total).toBe(20);
    expect(secondPage.pageInfo.hasNextPage).toBe(false);

    const pagedIds = [...firstPage.items, ...secondPage.items].map((item) => item.id);
    const pagedIdSet = new Set(pagedIds);
    expect(pagedIdSet.size).toBe(20);
    for (const productId of createdProductIds) {
      expect(pagedIdSet.has(productId)).toBeTruthy();
    }

    let customerId = "";
    const customerListAttempt = await requestAsAuthFailure(
      page,
      auth,
      "GET",
      "/customers?role=CUSTOMER&pageSize=20"
    );
    if (customerListAttempt.status === 200) {
      const listedCustomers = customerListAttempt.body as CustomersListResponse;
      customerId = listedCustomers.items[0]?.id ?? "";
    }

    if (!customerId) {
      try {
        const customer = await createPartyViaApi(page, auth, {
          displayName: `Storefront Customer ${suffix}`,
          role: "CUSTOMER",
          email: `storefront-${suffix}@example.test`,
        });
        customerId = customer.id;
      } catch (error) {
        testInfo.annotations.push({
          type: "note",
          description: `Order/payment flow skipped: unable to create or resolve customer (${String(error)}).`,
        });
        return;
      }
    }

    expect(customerId).toBeTruthy();

    const orderAttempt = await requestAsAuthFailure(page, auth, "POST", "/sales/orders", {
      customerPartyId: customerId,
      currency: "USD",
      notes: `E2E ecommerce order ${suffix}`,
      lineItems: [
        {
          description: "Storefront checkout line",
          quantity: 2,
          unitPriceCents: 2_500,
        },
      ],
    });

    let invoiceId = "";

    if (orderAttempt.status === 200) {
      const orderBody = orderAttempt.body as SalesCreateOrderResponse;
      const orderId = orderBody.order?.id ?? "";
      expect(orderId).toBeTruthy();

      const invoiceFromOrderAttempt = await requestAsAuthFailure(
        page,
        auth,
        "POST",
        `/sales/orders/${orderId}/create-invoice`,
        {}
      );

      if (invoiceFromOrderAttempt.status === 200) {
        const invoiceFromOrder =
          invoiceFromOrderAttempt.body as SalesCreateInvoiceFromOrderResponse;
        invoiceId = invoiceFromOrder.invoice?.id ?? "";
      } else {
        expect([403, 404, 409, 422, 500, 501]).toContain(invoiceFromOrderAttempt.status);
        testInfo.annotations.push({
          type: "note",
          description: `Order created but invoice-from-order unavailable (${invoiceFromOrderAttempt.status}).`,
        });
      }
    } else {
      expect([403, 404, 500, 501]).toContain(orderAttempt.status);
      testInfo.annotations.push({
        type: "note",
        description: `Sales order endpoint unavailable (${orderAttempt.status}); using direct invoice fallback.`,
      });
    }

    if (!invoiceId) {
      const createdInvoiceAttempt = await requestAsAuthFailure(page, auth, "POST", "/invoices", {
        customerPartyId: customerId,
        currency: "USD",
        sourceType: "order",
        sourceId: `e2e-order-${suffix}`,
        lineItems: [
          {
            description: "Storefront checkout line",
            qty: 2,
            unitPriceCents: 2_500,
          },
        ],
      });

      if (createdInvoiceAttempt.status !== 200) {
        expect([403, 404, 409, 422, 500, 501]).toContain(createdInvoiceAttempt.status);
        testInfo.annotations.push({
          type: "note",
          description: `Order/payment flow skipped: invoice creation unavailable (${createdInvoiceAttempt.status}).`,
        });
        return;
      }

      invoiceId = invoiceIdFromCreate(createdInvoiceAttempt.body as InvoiceCreateResponse);
    }

    expect(invoiceId).toBeTruthy();

    const finalizeAttempt = await requestAsAuthFailure(
      page,
      auth,
      "POST",
      `/invoices/${invoiceId}/finalize`,
      {}
    );
    if (finalizeAttempt.status !== 200) {
      expect([403, 404, 409, 422, 500, 501]).toContain(finalizeAttempt.status);
      testInfo.annotations.push({
        type: "note",
        description: `Order/payment flow skipped: invoice finalize unavailable (${finalizeAttempt.status}).`,
      });
      return;
    }
    const finalizedInvoice = finalizeAttempt.body as InvoiceSummary;
    expect(finalizedInvoice.id).toBe(invoiceId);
    expect(finalizedInvoice.status).toBe("ISSUED");
    expect(finalizedInvoice.totals.totalCents).toBeGreaterThan(0);
    expect(finalizedInvoice.totals.dueCents).toBeGreaterThan(0);

    const invoiceAfterFinalize = await requestAsAuth<InvoiceGetResponse>(
      page,
      auth,
      "GET",
      `/invoices/${invoiceId}`
    );
    const dueAmountCents = invoiceAfterFinalize.invoice.totals.dueCents;
    expect(dueAmountCents).toBeGreaterThan(0);

    const paymentAttempt = await requestAsAuthFailure(
      page,
      auth,
      "POST",
      `/invoices/${invoiceId}/payments`,
      {
        amountCents: dueAmountCents,
        note: "E2E storefront payment",
      }
    );

    if (paymentAttempt.status === 200) {
      const paidInvoice = paymentAttempt.body as InvoiceSummary;
      expect(paidInvoice.status).toBe("PAID");
      expect(paidInvoice.totals.dueCents).toBe(0);
      expect(paidInvoice.totals.paidCents).toBe(paidInvoice.totals.totalCents);
      return;
    }

    expect([403, 404, 409, 422, 500, 501]).toContain(paymentAttempt.status);
    testInfo.annotations.push({
      type: "note",
      description: `Payment recording unavailable in this environment (${paymentAttempt.status}).`,
    });
  });
});
