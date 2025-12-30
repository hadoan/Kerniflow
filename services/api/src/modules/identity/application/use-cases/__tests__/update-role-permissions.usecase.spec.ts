import { describe, it, expect, beforeEach } from "vitest";
import { UpdateRolePermissionsUseCase } from "../update-role-permissions.usecase";
import { FakeRoleRepository } from "../../../testkit/fakes/fake-role-repo";
import { FakeRolePermissionGrantRepository } from "../../../testkit/fakes/fake-role-permission-grant-repo";
import { MockAudit } from "../../../testkit/mocks/mock-audit";
import type { PermissionCatalogPort } from "../../ports/permission-catalog.port";
import { ValidationError } from "@shared/errors/domain-errors";

const tenantId = "tenant-1";
const roleId = "role-1";

let useCase: UpdateRolePermissionsUseCase;
let roleRepo: FakeRoleRepository;
let grantRepo: FakeRolePermissionGrantRepository;
let catalogPort: PermissionCatalogPort;

beforeEach(async () => {
  roleRepo = new FakeRoleRepository();
  grantRepo = new FakeRolePermissionGrantRepository();
  catalogPort = {
    getCatalog: () => [
      {
        id: "sales",
        label: "Sales",
        permissions: [
          {
            key: "sales.quotes.read",
            group: "sales",
            label: "View quotes",
          },
        ],
      },
    ],
  };

  await roleRepo.create({
    id: roleId,
    tenantId,
    name: "Custom",
    description: null,
    isSystem: false,
  });

  useCase = new UpdateRolePermissionsUseCase(roleRepo, catalogPort, grantRepo, new MockAudit());
});

describe("UpdateRolePermissionsUseCase", () => {
  it("rejects unknown permission keys", async () => {
    await expect(
      useCase.execute({
        tenantId,
        actorUserId: "user-1",
        roleId,
        grants: [{ key: "unknown.permission", effect: "ALLOW" }],
      })
    ).rejects.toBeInstanceOf(ValidationError);
  });
});
