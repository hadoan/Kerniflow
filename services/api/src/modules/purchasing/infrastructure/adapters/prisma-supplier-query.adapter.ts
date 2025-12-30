import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import type {
  SupplierQueryPort,
  ListSuppliersResult,
} from "../../application/ports/supplier-query.port";
import type { PartyDto, PartyRoleType } from "@corely/contracts";

const toPartyDto = (row: any): PartyDto => {
  const primaryEmail = row.contactPoints?.find((cp: any) => cp.type === "EMAIL" && cp.isPrimary);
  const primaryPhone = row.contactPoints?.find((cp: any) => cp.type === "PHONE" && cp.isPrimary);
  const billingAddress = row.addresses?.find((addr: any) => addr.type === "BILLING");

  return {
    id: row.id,
    tenantId: row.tenantId,
    displayName: row.displayName,
    roles: row.roles.map((role: any) => role.role as PartyRoleType),
    vatId: row.vatId ?? null,
    notes: row.notes ?? null,
    tags: row.tags ?? [],
    email: primaryEmail?.value ?? null,
    phone: primaryPhone?.value ?? null,
    billingAddress: billingAddress
      ? {
          line1: billingAddress.line1,
          line2: billingAddress.line2 ?? undefined,
          city: billingAddress.city ?? undefined,
          postalCode: billingAddress.postalCode ?? undefined,
          country: billingAddress.country ?? undefined,
        }
      : null,
    archivedAt: row.archivedAt,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
};

@Injectable()
export class PrismaSupplierQueryAdapter implements SupplierQueryPort {
  constructor(private readonly prisma: PrismaService) {}

  async getSupplierById(tenantId: string, supplierPartyId: string): Promise<PartyDto | null> {
    const data = await this.prisma.party.findFirst({
      where: {
        id: supplierPartyId,
        tenantId,
        roles: { some: { role: "SUPPLIER" } },
      },
      include: { roles: true, contactPoints: true, addresses: true },
    });
    return data ? toPartyDto(data) : null;
  }

  async listSuppliers(
    tenantId: string,
    params: { search?: string; cursor?: string; pageSize?: number }
  ): Promise<ListSuppliersResult> {
    const where: any = {
      tenantId,
      roles: { some: { role: "SUPPLIER" } },
      archivedAt: null,
    };

    if (params.search) {
      where.displayName = { contains: params.search, mode: "insensitive" };
    }

    const take = params.pageSize ?? 20;
    const results = await this.prisma.party.findMany({
      where,
      take,
      skip: params.cursor ? 1 : 0,
      ...(params.cursor ? { cursor: { id: params.cursor } } : {}),
      orderBy: { updatedAt: "desc" },
      include: { roles: true, contactPoints: true, addresses: true },
    });

    const suppliers = results.map(toPartyDto);
    const nextCursor = results.length === take ? results[results.length - 1]?.id : null;
    return { suppliers, nextCursor };
  }
}
