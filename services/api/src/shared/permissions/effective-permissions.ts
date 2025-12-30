import type { RolePermissionEffect } from "@corely/contracts";

export interface RolePermissionGrant {
  key: string;
  effect: RolePermissionEffect;
}

export interface EffectivePermissionSet {
  allowAll: boolean;
  allowed: Set<string>;
  denied: Set<string>;
}

export const computeEffectivePermissionSet = (
  grants: RolePermissionGrant[]
): EffectivePermissionSet => {
  const allowed = new Set<string>();
  const denied = new Set<string>();
  let allowAll = false;

  for (const grant of grants) {
    if (grant.key === "*" && grant.effect === "ALLOW") {
      allowAll = true;
      continue;
    }

    if (grant.effect === "DENY") {
      denied.add(grant.key);
      allowed.delete(grant.key);
      continue;
    }

    if (grant.effect === "ALLOW") {
      if (!denied.has(grant.key)) {
        allowed.add(grant.key);
      }
    }
  }

  for (const deniedKey of denied) {
    allowed.delete(deniedKey);
  }

  return {
    allowAll,
    allowed,
    denied,
  };
};

export const hasPermission = (set: EffectivePermissionSet, required: string): boolean => {
  if (set.denied.has(required)) {
    return false;
  }
  if (set.allowAll) {
    return true;
  }
  return set.allowed.has(required);
};

export const toAllowedPermissionKeys = (grants: RolePermissionGrant[]): string[] => {
  const set = computeEffectivePermissionSet(grants);
  return Array.from(set.allowed);
};
