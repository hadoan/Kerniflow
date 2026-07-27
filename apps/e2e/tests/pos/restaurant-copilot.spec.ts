import { expect, test, type Page } from "@playwright/test";
import { bootstrapAuthenticatedPos, selectRegister } from "./helpers.ts";
import {
  installRestaurantPosCopilotMock,
  type RestaurantPosCopilotMock,
} from "./restaurant-copilot.helpers.ts";

async function bootstrapRestaurantTable(page: Page): Promise<RestaurantPosCopilotMock> {
  const mock = await installRestaurantPosCopilotMock(page);
  await bootstrapAuthenticatedPos(page);
  await selectRegister(page);
  await expect(page.getByTestId("pos-home-screen")).toBeVisible({ timeout: 20_000 });
  await page.goto(`/restaurant/table/${mock.ids.tableId}`);
  await expect(page.getByTestId("pos-restaurant-table-screen")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("pos-restaurant-order-title")).toBeVisible();
  return mock;
}

async function bootstrapRestaurantFloor(page: Page): Promise<RestaurantPosCopilotMock> {
  const mock = await installRestaurantPosCopilotMock(page);
  await bootstrapAuthenticatedPos(page);
  await selectRegister(page);
  await expect(page.getByTestId("pos-home-screen")).toBeVisible({ timeout: 20_000 });
  await page.getByRole("tab", { name: /restaurant/i }).click();
  await expect(page.getByTestId("pos-restaurant-floor-screen")).toBeVisible({ timeout: 20_000 });
  return mock;
}

async function bootstrapShiftClose(page: Page): Promise<RestaurantPosCopilotMock> {
  const mock = await installRestaurantPosCopilotMock(page);
  await bootstrapAuthenticatedPos(page);
  await selectRegister(page);
  await expect(page.getByTestId("pos-home-screen")).toBeVisible({ timeout: 20_000 });
  await page.getByRole("tab", { name: /settings/i }).click();
  await expect(page.getByTestId("pos-settings-screen")).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: /close shift/i }).click();
  await expect(page.getByTestId("pos-shift-close-screen")).toBeVisible({ timeout: 20_000 });
  return mock;
}

test.describe("Restaurant POS copilot", () => {
  test("renders a structured order proposal from natural language without mutating the order before apply", async ({
    page,
  }) => {
    const mock = await bootstrapRestaurantTable(page);

    await expect(page.getByTestId("pos-restaurant-order-empty")).toBeVisible();
    await page
      .getByTestId("pos-restaurant-order-copilot-input")
      .fill("2 margherita, 1 coke, extra cheese, no onion");
    await page.getByTestId("pos-restaurant-order-copilot-submit").click();

    await expect(page.getByTestId("pos-restaurant-order-copilot-card")).toBeVisible();
    await expect(page.getByTestId("pos-restaurant-order-copilot-summary")).toContainText(
      "2 Margherita"
    );
    await expect(page.getByTestId("pos-restaurant-order-copilot-apply")).toBeEnabled();

    expect(mock.getDraftCalls()).toHaveLength(0);
    expect(mock.getActiveOrder()?.items).toHaveLength(0);
    await expect(page.getByTestId("pos-restaurant-order-empty")).toBeVisible();
  });

  test("applies an order proposal through the normal draft endpoint and updates the table order", async ({
    page,
  }) => {
    const mock = await bootstrapRestaurantTable(page);

    await page
      .getByTestId("pos-restaurant-order-copilot-input")
      .fill("2 margherita, 1 coke, extra cheese, no onion");
    await page.getByTestId("pos-restaurant-order-copilot-submit").click();
    await expect(page.getByTestId("pos-restaurant-order-copilot-card")).toBeVisible();

    await page.getByTestId("pos-restaurant-order-copilot-apply").click();
    await expect.poll(() => mock.getDraftCalls().length).toBe(1);

    const appliedOrder = mock.getActiveOrder();
    expect(appliedOrder).not.toBeNull();
    await expect(
      page.getByTestId(`pos-restaurant-order-item-name-${appliedOrder?.items[0]?.id ?? ""}`)
    ).toHaveText("Margherita");
    await expect(
      page.getByTestId(`pos-restaurant-order-item-name-${appliedOrder?.items[1]?.id ?? ""}`)
    ).toHaveText("Coke");
    await expect(
      page.getByTestId(`pos-restaurant-order-item-meta-${appliedOrder?.items[0]?.id ?? ""}`)
    ).toHaveText("Extra cheese, No onion");

    const draftCalls = mock.getDraftCalls();
    expect(draftCalls).toHaveLength(1);
    expect(draftCalls[0]?.orderId).toBe(appliedOrder?.id);
    expect(draftCalls[0]?.items).toHaveLength(2);
    expect(draftCalls[0]?.items[0]?.quantity).toBe(2);
    expect(draftCalls[0]?.items[0]?.modifiers).toHaveLength(2);
    expect(mock.getActiveOrder()?.totalCents).toBe(3103);
  });

  test("dismisses a proposal without mutating the order", async ({ page }) => {
    const mock = await bootstrapRestaurantTable(page);

    await page
      .getByTestId("pos-restaurant-order-copilot-input")
      .fill("2 margherita, 1 coke, extra cheese, no onion");
    await page.getByTestId("pos-restaurant-order-copilot-submit").click();
    await expect(page.getByTestId("pos-restaurant-order-copilot-card")).toBeVisible();

    await page.getByTestId("pos-restaurant-order-copilot-dismiss").click();

    await expect(page.getByTestId("pos-restaurant-order-copilot-card")).toHaveCount(0);
    expect(mock.getDraftCalls()).toHaveLength(0);
    expect(mock.getActiveOrder()?.items).toHaveLength(0);
    await expect(page.getByTestId("pos-restaurant-order-empty")).toBeVisible();
  });

  test("shows explicit ambiguity for ambiguous menu input and does not mutate the draft", async ({
    page,
  }) => {
    const mock = await bootstrapRestaurantTable(page);

    await page.getByTestId("pos-restaurant-order-copilot-input").fill("1 piz");
    await page.getByTestId("pos-restaurant-order-copilot-submit").click();

    await expect(page.getByTestId("pos-restaurant-order-copilot-card")).toBeVisible();
    await expect(page.getByText("Multiple menu items match")).toBeVisible();
    await expect(page.getByTestId("pos-restaurant-order-copilot-apply")).toBeDisabled();

    expect(mock.getDraftCalls()).toHaveLength(0);
    expect(mock.getActiveOrder()?.items).toHaveLength(0);
    await expect(page.getByTestId("pos-restaurant-order-empty")).toBeVisible();
  });

  test("keeps manual ordering available when the copilot is unavailable", async ({ page }) => {
    const mock = await installRestaurantPosCopilotMock(page, { copilotMode: "unavailable" });
    await bootstrapAuthenticatedPos(page);
    await selectRegister(page);
    await expect(page.getByTestId("pos-home-screen")).toBeVisible({ timeout: 20_000 });
    await page.goto(`/restaurant/table/${mock.ids.tableId}`);
    await expect(page.getByTestId("pos-restaurant-table-screen")).toBeVisible({ timeout: 20_000 });

    await page.getByTestId("pos-restaurant-order-copilot-input").fill("add a coke");
    await page.getByTestId("pos-restaurant-order-copilot-submit").click();

    await expect(page.getByTestId("pos-restaurant-order-copilot-error")).toContainText(
      "Restaurant copilot request failed (503)"
    );

    await expect(page.getByTestId(`pos-restaurant-product-${mock.ids.cokeId}`)).toBeVisible({
      timeout: 20_000,
    });
    await page.getByTestId(`pos-restaurant-product-${mock.ids.cokeId}`).click();
    await expect.poll(() => mock.getDraftCalls().length).toBe(1);

    const activeOrder = mock.getActiveOrder();
    expect(activeOrder).not.toBeNull();
    await expect(
      page.getByTestId(`pos-restaurant-order-item-name-${activeOrder?.items[0]?.id ?? ""}`)
    ).toHaveText("Coke");
    expect(mock.getDraftCalls()).toHaveLength(1);
    expect(mock.getDraftCalls()[0]?.items[0]?.catalogItemId).toBe(mock.ids.cokeId);
    expect(mock.getActiveOrder()?.items).toHaveLength(1);
  });

  test("renders a read-only floor attention summary without opening or mutating tables", async ({
    page,
  }) => {
    const mock = await bootstrapRestaurantFloor(page);

    await page.getByTestId("pos-restaurant-floor-copilot-quick-summarize-attention-tables").click();

    await expect(page.getByTestId("pos-restaurant-floor-copilot-card")).toBeVisible();
    await expect(page.getByTestId("pos-restaurant-floor-copilot-floor-item-0")).toContainText("T2");
    await expect(page.getByTestId("pos-restaurant-floor-copilot-floor-item-1")).toContainText(
      "DIRTY"
    );

    expect(mock.getOpenTableCalls()).toHaveLength(0);
    expect(mock.getDraftCalls()).toHaveLength(0);
  });

  test("renders a shift-close summary without triggering shift close automatically", async ({
    page,
  }) => {
    const mock = await bootstrapShiftClose(page);

    await page.getByTestId("pos-restaurant-shift-copilot-quick-generate-shift-summary").click();

    await expect(page.getByTestId("pos-restaurant-shift-copilot-card")).toBeVisible();
    await expect(page.getByTestId("pos-restaurant-shift-copilot-shift-anomaly-0")).toContainText(
      "unpaid"
    );
    expect(mock.getCloseCalls()).toHaveLength(0);
  });

  test("does not auto-close or auto-pay a table from a copilot instruction", async ({ page }) => {
    const mock = await bootstrapRestaurantTable(page);

    await page
      .getByTestId("pos-restaurant-order-copilot-input")
      .fill("close this table and take payment");
    await page.getByTestId("pos-restaurant-order-copilot-submit").click();

    await expect(page.getByTestId("pos-restaurant-order-copilot-card")).toBeVisible();
    await expect(page.getByTestId("pos-restaurant-order-copilot-summary")).toContainText(
      "Payment and finalization"
    );
    await expect(page.getByTestId("pos-restaurant-order-copilot-apply")).toBeDisabled();
    expect(mock.getCloseCalls()).toHaveLength(0);
    expect(mock.getDraftCalls()).toHaveLength(0);
    expect(mock.getActiveOrder()?.status).toBe("DRAFT");
  });
});
