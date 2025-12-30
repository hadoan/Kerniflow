import type { PermissionGroup, RolePermissionEffect } from "@corely/contracts";

export type DefaultRoleKey = "OWNER" | "ADMIN" | "ACCOUNTANT" | "STAFF" | "READ_ONLY";

export const buildDefaultRoleGrants = (
  catalog: PermissionGroup[]
): Record<DefaultRoleKey, Array<{ key: string; effect: RolePermissionEffect }>> => {
  const allKeys = catalog.flatMap((group) => group.permissions.map((permission) => permission.key));

  const uniqueKeys = Array.from(new Set(allKeys));
  const readKeys = uniqueKeys.filter((key) => key.endsWith(".read"));

  const accountantKeys = uniqueKeys.filter(
    (key) =>
      key.startsWith("sales.invoices.") ||
      key.startsWith("sales.payments.") ||
      key.startsWith("expenses.") ||
      key.startsWith("accounting.") ||
      key.startsWith("purchasing.")
  );

  const staffKeys = uniqueKeys.filter(
    (key) => key.endsWith(".read") && !key.startsWith("settings.")
  );

  const readOnlyKeys = readKeys.filter((key) => !key.startsWith("settings."));

  return {
    OWNER: uniqueKeys.map((key) => ({ key, effect: "ALLOW" })),
    ADMIN: uniqueKeys.map((key) => ({ key, effect: "ALLOW" })),
    ACCOUNTANT: accountantKeys.map((key) => ({ key, effect: "ALLOW" })),
    STAFF: staffKeys.map((key) => ({ key, effect: "ALLOW" })),
    READ_ONLY: readOnlyKeys.map((key) => ({ key, effect: "ALLOW" })),
  };
};
