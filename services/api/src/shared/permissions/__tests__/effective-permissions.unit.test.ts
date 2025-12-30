import { describe, expect, it } from "vitest";
import type { RolePermissionEffect } from "@corely/contracts";
import {
  computeEffectivePermissionSet,
  hasPermission,
  toAllowedPermissionKeys,
} from "../effective-permissions";

describe("Effective permission computations", () => {
  it("deduplicates allows, honors deny precedence, and exposes allowAll", () => {
    const grants: Array<{ key: string; effect: RolePermissionEffect }> = [
      { key: "menu.view", effect: "ALLOW" },
      { key: "menu.view", effect: "DENY" },
      { key: "menu.edit", effect: "ALLOW" },
      { key: "menu.edit", effect: "ALLOW" },
      { key: "*", effect: "ALLOW" },
    ];

    const set = computeEffectivePermissionSet(grants);
    expect(set.allowAll).toBe(true);
    expect(set.denied.has("menu.view")).toBe(true);
    expect(set.allowed.has("menu.view")).toBe(false);
    expect(set.allowed.has("menu.edit")).toBe(true);

    expect(hasPermission(set, "menu.view")).toBe(false);
    expect(hasPermission(set, "menu.edit")).toBe(true);
    expect(hasPermission(set, "unknown.permission")).toBe(true);

    const allowed = toAllowedPermissionKeys(grants);
    expect(new Set(allowed)).toEqual(new Set(["menu.edit"]));
  });
});
