import { Injectable } from "@nestjs/common";
import { prisma } from "@kerniflow/data";
import { CustomerQueryPort } from "../../application/ports/customer-query.port";
import { CustomerBillingSnapshotDTO } from "@kerniflow/contracts";

@Injectable()
export class PrismaCustomerQueryAdapter implements CustomerQueryPort {
  async getCustomerBillingSnapshot(
    tenantId: string,
    partyId: string
  ): Promise<CustomerBillingSnapshotDTO | null> {
    const party = await prisma.party.findFirst({
      where: { id: partyId, tenantId, roles: { some: { role: "CUSTOMER" } } },
      include: { contactPoints: true, addresses: true },
    });
    if (!party) return null;

    const email = party.contactPoints.find((cp) => cp.type === "EMAIL" && cp.isPrimary)?.value;
    const billingAddress = party.addresses.find((addr) => addr.type === "BILLING");

    return {
      partyId: party.id,
      displayName: party.displayName,
      email: email ?? undefined,
      vatId: party.vatId ?? undefined,
      billingAddress: billingAddress
        ? {
            line1: billingAddress.line1,
            line2: billingAddress.line2 ?? undefined,
            city: billingAddress.city ?? undefined,
            postalCode: billingAddress.postalCode ?? undefined,
            country: billingAddress.country ?? undefined,
          }
        : undefined,
    };
  }
}
