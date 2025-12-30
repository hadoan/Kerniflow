import { Inject, Injectable } from "@nestjs/common";
import type { PermissionCatalogResponse } from "@corely/contracts";
import type { PermissionCatalogPort } from "../ports/permission-catalog.port";
import { PERMISSION_CATALOG_PORT } from "../ports/permission-catalog.port";

export interface GetPermissionCatalogQuery {
  tenantId: string;
  actorUserId: string;
}

@Injectable()
export class GetPermissionCatalogUseCase {
  constructor(
    @Inject(PERMISSION_CATALOG_PORT) private readonly catalogPort: PermissionCatalogPort
  ) {}

  async execute(_query: GetPermissionCatalogQuery): Promise<PermissionCatalogResponse> {
    return { catalog: this.catalogPort.getCatalog() };
  }
}
