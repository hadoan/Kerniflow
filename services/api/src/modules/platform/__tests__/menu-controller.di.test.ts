import { describe, expect, it, vi } from "vitest";
import { MenuController } from "../adapters/http/menu.controller";

describe("MenuController DI wiring", () => {
  it("constructs with required dependencies", () => {
    const composeMenuUseCase = { execute: vi.fn() };
    const updateMenuOverridesUseCase = { execute: vi.fn() };
    const resetMenuOverridesUseCase = { execute: vi.fn() };
    const grantRepo = { listByRoleIdsAndTenant: vi.fn() };

    const controller = new MenuController(
      composeMenuUseCase as any,
      updateMenuOverridesUseCase as any,
      resetMenuOverridesUseCase as any,
      grantRepo as any
    );

    expect(controller).toBeDefined();
  });
});
