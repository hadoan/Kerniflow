import { expect, test, type Page } from "@playwright/test";
import { POS_AUTH_TOKENS, POS_IDS, autoAcceptNativeDialogs, installPosApiMock } from "./helpers.ts";

function seedAuthenticatedStorage(page: Page): Promise<void> {
  return page.addInitScript(
    ({ ids, tokens }) => {
      const prefix = "corely-pos.secure.";
      const set = (key: string, value: string) => localStorage.setItem(`${prefix}${key}`, value);

      localStorage.clear();

      set("accessToken", tokens.accessToken);
      set("refreshToken", tokens.refreshToken);
      set("activeWorkspaceId", ids.workspaceId);
      set("pos.require-open-shift-for-sales", "false");
      set("pos.language", "en");
      set(
        "user",
        JSON.stringify({
          userId: ids.userId,
          workspaceId: ids.workspaceId,
          email: "cashier@corely.test",
        })
      );
    },
    { ids: POS_IDS, tokens: POS_AUTH_TOKENS }
  );
}

async function ensureProductVisible(page: Page): Promise<void> {
  const product = page.getByTestId(`pos-home-product-${POS_IDS.productId}`);
  const alreadyVisible = await product.isVisible({ timeout: 3_000 }).catch(() => false);
  if (alreadyVisible) {
    return;
  }

  const syncCatalogButton = page.getByRole("button", { name: /sync catalog/i });
  if (await syncCatalogButton.isVisible({ timeout: 3_000 }).catch(() => false)) {
    await syncCatalogButton.click();
  }

  await expect(product).toBeVisible({ timeout: 20_000 });
}

test.describe("POS checkout flow", () => {
  test("selects register, adds one product to cart, and completes payment", async ({ page }) => {
    autoAcceptNativeDialogs(page);
    await installPosApiMock(page, { startWithOpenShift: true });
    await seedAuthenticatedStorage(page);

    await page.goto("/register-selection");
    await expect(page.getByTestId("pos-register-selection-screen")).toBeVisible({
      timeout: 20_000,
    });
    await expect(page.getByTestId(`pos-register-item-${POS_IDS.registerId}`)).toBeVisible();

    await page.getByTestId(`pos-register-item-${POS_IDS.registerId}`).click();
    await expect(page.getByTestId("pos-home-screen")).toBeVisible({ timeout: 20_000 });

    await ensureProductVisible(page);
    await page.getByTestId(`pos-home-product-${POS_IDS.productId}`).click();

    const openCartButton = page.getByTestId("pos-home-open-cart");
    const bottomCartButton = page.getByTestId("pos-home-bottom-cart");
    if (await openCartButton.isVisible({ timeout: 3_000 }).catch(() => false)) {
      await openCartButton.click();
    } else {
      await bottomCartButton.click();
    }

    await expect(page.getByTestId("pos-cart-screen")).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByTestId("pos-cart-screen").getByText("Demo Coffee Beans").first()
    ).toBeVisible({
      timeout: 20_000,
    });

    await page.getByTestId("pos-cart-checkout").click();
    await expect(page.getByTestId("pos-checkout-screen")).toBeVisible({ timeout: 20_000 });

    await page.getByTestId("pos-checkout-add-remaining").click();
    await expect(page.getByTestId("pos-checkout-complete-sale")).toBeEnabled({ timeout: 20_000 });
    await page.getByTestId("pos-checkout-complete-sale").click();

    await expect(page.getByTestId("pos-receipt-screen")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId("pos-receipt-title")).toBeVisible();
  });
});
