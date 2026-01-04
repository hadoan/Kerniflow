import { Injectable } from "@nestjs/common";
import { PrismaService } from "@corely/data";
import { PartyAggregate } from "../../domain/party.aggregate";
import {
  PartyRepoPort,
  ListCustomersFilters,
  Pagination,
} from "../../application/ports/party-repository.port";
import { PartyRoleType } from "../../domain/party-role";
import { ContactPointType } from "../../domain/contact-point";
import { Address } from "../../domain/address";
type PartyRoleRow = {
  id: string;
  tenantId: string;
  partyId: string;
  role: PartyRoleType;
};

type ContactPointRow = {
  id: string;
  tenantId: string;
  partyId: string;
  type: ContactPointType;
  value: string;
  isPrimary: boolean;
};

type AddressRow = {
  id: string;
  tenantId: string;
  partyId: string;
  type: "BILLING";
  line1: string;
  line2: string | null;
  city: string | null;
  postalCode: string | null;
  country: string | null;
};

type PartyWithRelations = {
  id: string;
  tenantId: string;
  displayName: string;
  vatId: string | null;
  notes: string | null;
  tags: string[];
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  contactPoints: ContactPointRow[];
  addresses: AddressRow[];
  roles: PartyRoleRow[];
};

const toAggregate = (row: PartyWithRelations): PartyAggregate => {
  const billingAddress = row.addresses.find((addr) => addr.type === "BILLING");
  return new PartyAggregate({
    id: row.id,
    tenantId: row.tenantId,
    displayName: row.displayName,
    contactPoints: row.contactPoints.map((cp) => ({
      id: cp.id,
      type: cp.type as ContactPointType,
      value: cp.value,
      isPrimary: cp.isPrimary,
    })),
    billingAddress: billingAddress
      ? ({
          id: billingAddress.id,
          type: "BILLING",
          line1: billingAddress.line1,
          line2: billingAddress.line2,
          city: billingAddress.city,
          postalCode: billingAddress.postalCode,
          country: billingAddress.country,
        } satisfies Address)
      : null,
    vatId: row.vatId,
    notes: row.notes,
    tags: row.tags ?? [],
    archivedAt: row.archivedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    roles: row.roles.map((role) => role.role as PartyRoleType),
  });
};

@Injectable()
export class PrismaPartyRepoAdapter implements PartyRepoPort {
  constructor(private readonly prisma: PrismaService) {}

  async createCustomer(tenantId: string, party: PartyAggregate): Promise<void> {
    if (tenantId !== party.tenantId) {
      throw new Error("Tenant mismatch when creating customer");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.party.create({
        data: {
          id: party.id,
          tenantId: party.tenantId,
          displayName: party.displayName,
          vatId: party.vatId,
          notes: party.notes,
          tags: party.tags,
          archivedAt: party.archivedAt,
          createdAt: party.createdAt,
          updatedAt: party.updatedAt,
        },
      });

      await tx.partyRole.create({
        data: {
          tenantId: party.tenantId,
          partyId: party.id,
          role: "CUSTOMER",
        },
      });

      if (party.contactPoints.length) {
        await tx.contactPoint.createMany({
          data: party.contactPoints.map((cp) => ({
            id: cp.id,
            tenantId: party.tenantId,
            partyId: party.id,
            type: cp.type,
            value: cp.value,
            isPrimary: cp.isPrimary,
          })),
        });
      }

      if (party.billingAddress) {
        await tx.address.create({
          data: {
            id: party.billingAddress.id,
            tenantId: party.tenantId,
            partyId: party.id,
            type: "BILLING",
            line1: party.billingAddress.line1,
            line2: party.billingAddress.line2,
            city: party.billingAddress.city,
            postalCode: party.billingAddress.postalCode,
            country: party.billingAddress.country,
          },
        });
      }
    });
  }

  async updateCustomer(tenantId: string, party: PartyAggregate): Promise<void> {
    if (tenantId !== party.tenantId) {
      throw new Error("Tenant mismatch when updating customer");
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.party.update({
        where: { id: party.id },
        data: {
          displayName: party.displayName,
          vatId: party.vatId,
          notes: party.notes,
          tags: party.tags,
          archivedAt: party.archivedAt,
          updatedAt: party.updatedAt,
        },
      });

      await tx.partyRole.upsert({
        where: {
          tenantId_partyId_role: {
            tenantId,
            partyId: party.id,
            role: "CUSTOMER",
          },
        },
        update: {},
        create: {
          tenantId,
          partyId: party.id,
          role: "CUSTOMER",
        },
      });

      const contactTypes = party.contactPoints.map((cp) => cp.type);
      for (const contact of party.contactPoints) {
        await tx.contactPoint.upsert({
          where: {
            tenantId_partyId_type: {
              tenantId,
              partyId: party.id,
              type: contact.type,
            },
          },
          update: {
            value: contact.value,
            isPrimary: contact.isPrimary,
          },
          create: {
            id: contact.id,
            tenantId,
            partyId: party.id,
            type: contact.type,
            value: contact.value,
            isPrimary: contact.isPrimary,
          },
        });
      }

      if (contactTypes.length) {
        await tx.contactPoint.deleteMany({
          where: {
            tenantId,
            partyId: party.id,
            type: { notIn: contactTypes },
          },
        });
      } else {
        await tx.contactPoint.deleteMany({ where: { tenantId, partyId: party.id } });
      }

      if (party.billingAddress) {
        await tx.address.upsert({
          where: {
            tenantId_partyId_type_address: {
              tenantId,
              partyId: party.id,
              type: "BILLING",
            },
          },
          update: {
            line1: party.billingAddress.line1,
            line2: party.billingAddress.line2,
            city: party.billingAddress.city,
            postalCode: party.billingAddress.postalCode,
            country: party.billingAddress.country,
          },
          create: {
            id: party.billingAddress.id,
            tenantId,
            partyId: party.id,
            type: "BILLING",
            line1: party.billingAddress.line1,
            line2: party.billingAddress.line2,
            city: party.billingAddress.city,
            postalCode: party.billingAddress.postalCode,
            country: party.billingAddress.country,
          },
        });
      } else {
        await tx.address.deleteMany({
          where: { tenantId, partyId: party.id, type: "BILLING" },
        });
      }
    });
  }

  async findCustomerById(tenantId: string, partyId: string): Promise<PartyAggregate | null> {
    const row = (await this.prisma.party.findFirst({
      where: { id: partyId, tenantId, roles: { some: { role: "CUSTOMER" as const } } },
      include: { contactPoints: true, addresses: true, roles: true },
    })) as PartyWithRelations | null;
    if (!row) {
      return null;
    }
    return toAggregate(row);
  }

  async listCustomers(tenantId: string, filters: ListCustomersFilters, pagination: Pagination) {
    const where = {
      tenantId,
      roles: { some: { role: "CUSTOMER" as const } },
      archivedAt: filters.includeArchived ? undefined : null,
    };

    const results = await this.prisma.party.findMany({
      where,
      take: pagination.pageSize ?? 20,
      skip: pagination.cursor ? 1 : 0,
      ...(pagination.cursor ? { cursor: { id: pagination.cursor } } : {}),
      orderBy: { createdAt: "desc" },
      include: { contactPoints: true, addresses: true, roles: true },
    });

    const items = results.map((row) => toAggregate(row as PartyWithRelations));
    const nextCursor = items.length === (pagination.pageSize ?? 20) ? items.at(-1)?.id : null;
    return { items, nextCursor };
  }

  async searchCustomers(tenantId: string, q: string | undefined, pagination: Pagination) {
    const where = {
      tenantId,
      roles: { some: { role: "CUSTOMER" as const } },
      archivedAt: null,
      ...(q && q.trim()
        ? {
            OR: [
              { displayName: { contains: q, mode: "insensitive" as const } },
              {
                contactPoints: {
                  some: { value: { contains: q, mode: "insensitive" as const } },
                },
              },
              { vatId: { contains: q, mode: "insensitive" as const } },
              { notes: { contains: q, mode: "insensitive" as const } },
            ],
          }
        : {}),
    };

    const results = await this.prisma.party.findMany({
      where,
      take: pagination.pageSize ?? 20,
      skip: pagination.cursor ? 1 : 0,
      ...(pagination.cursor ? { cursor: { id: pagination.cursor } } : {}),
      orderBy: { createdAt: "desc" },
      include: { contactPoints: true, addresses: true, roles: true },
    });

    const items = results.map((row) => toAggregate(row as PartyWithRelations));
    const nextCursor = items.length === (pagination.pageSize ?? 20) ? items.at(-1)?.id : null;
    return { items, nextCursor };
  }
}
