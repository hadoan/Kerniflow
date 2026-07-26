import type { UseCaseContext } from "@corely/kernel";
import { ForbiddenError } from "@corely/kernel";
import { assertCan, assertAuthenticated } from "@/shared/policies/assert-can";

const hasPermission = (ctx: UseCaseContext, permission: string): boolean => {
  const rawPermissions = ctx.metadata?.permissions;
  if (!Array.isArray(rawPermissions) || rawPermissions.length === 0) {
    return true;
  }

  const permissions = rawPermissions.filter((item): item is string => typeof item === "string");
  if (permissions.includes("*")) {
    return true;
  }

  return permissions.includes(permission);
};

export const assertCanManageCash = (ctx: UseCaseContext, _registerId?: string) => {
  assertCan(ctx);
  assertAuthenticated(ctx);

  if (!hasPermission(ctx, "cash.write")) {
    throw new ForbiddenError("Missing permission", undefined, "CashManagement:PermissionDenied");
  }
};

export const assertCanReadCash = (ctx: UseCaseContext, _registerId?: string) => {
  assertCan(ctx);
  assertAuthenticated(ctx);

  if (!hasPermission(ctx, "cash.read")) {
    throw new ForbiddenError("Missing permission", undefined, "CashManagement:PermissionDenied");
  }
};

export const assertCanCloseCash = (ctx: UseCaseContext, _registerId?: string) => {
  assertCan(ctx);
  assertAuthenticated(ctx);

  if (!hasPermission(ctx, "cash.close")) {
    throw new ForbiddenError("Missing permission", undefined, "CashManagement:PermissionDenied");
  }
};

export const assertCanExportCash = (ctx: UseCaseContext, _registerId?: string) => {
  assertCan(ctx);
  assertAuthenticated(ctx);

  if (!hasPermission(ctx, "cash.export")) {
    throw new ForbiddenError("Missing permission", undefined, "CashManagement:PermissionDenied");
  }
};
