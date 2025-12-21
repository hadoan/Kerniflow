import { Address } from "./address";
import { ContactPoint, ContactPointType } from "./contact-point";
import { PartyRoleType } from "./party-role";

type PartyProps = {
  id: string;
  tenantId: string;
  displayName: string;
  contactPoints: ContactPoint[];
  billingAddress: Address | null;
  vatId?: string | null;
  notes?: string | null;
  tags?: string[];
  archivedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
  roles: PartyRoleType[];
};

export type CustomerPatch = {
  displayName?: string;
  email?: string | null;
  phone?: string | null;
  billingAddress?: Address | null;
  vatId?: string | null;
  notes?: string | null;
  tags?: string[] | null;
};

export class PartyAggregate {
  id: string;
  tenantId: string;
  displayName: string;
  contactPoints: ContactPoint[];
  billingAddress: Address | null;
  vatId: string | null;
  notes: string | null;
  tags: string[];
  archivedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  roles: PartyRoleType[];

  constructor(props: PartyProps) {
    if (!props.displayName.trim()) {
      throw new Error("Display name is required");
    }

    this.id = props.id;
    this.tenantId = props.tenantId;
    this.displayName = props.displayName.trim();
    this.contactPoints = props.contactPoints;
    this.billingAddress = props.billingAddress;
    this.vatId = props.vatId ?? null;
    this.notes = props.notes ?? null;
    this.tags = props.tags ?? [];
    this.archivedAt = props.archivedAt ?? null;
    this.createdAt = props.createdAt;
    this.updatedAt = props.updatedAt;
    this.roles = props.roles;
  }

  static createCustomer(params: {
    id: string;
    tenantId: string;
    displayName: string;
    email?: string | null;
    phone?: string | null;
    billingAddress?: Address | null;
    vatId?: string | null;
    notes?: string | null;
    tags?: string[];
    createdAt: Date;
    generateId: () => string;
  }) {
    const aggregate = new PartyAggregate({
      id: params.id,
      tenantId: params.tenantId,
      displayName: params.displayName,
      contactPoints: [],
      billingAddress: null,
      vatId: params.vatId ?? null,
      notes: params.notes ?? null,
      tags: params.tags ?? [],
      archivedAt: null,
      createdAt: params.createdAt,
      updatedAt: params.createdAt,
      roles: ["CUSTOMER"],
    });
    aggregate.setContactPoint("EMAIL", params.email ?? null, params.generateId);
    aggregate.setContactPoint("PHONE", params.phone ?? null, params.generateId);
    aggregate.setBillingAddress(params.billingAddress ?? null, params.generateId);
    return aggregate;
  }

  updateCustomer(patch: CustomerPatch, now: Date, generateId: () => string) {
    if (this.archivedAt) {
      throw new Error("Archived customers cannot be updated");
    }

    if (patch.displayName !== undefined) {
      if (!patch.displayName.trim()) {
        throw new Error("Display name is required");
      }
      this.displayName = patch.displayName.trim();
    }

    this.setContactPoint("EMAIL", patch.email, generateId);
    this.setContactPoint("PHONE", patch.phone, generateId);
    this.setBillingAddress(patch.billingAddress, generateId);

    if (patch.vatId !== undefined) {
      this.vatId = patch.vatId ?? null;
    }
    if (patch.notes !== undefined) {
      this.notes = patch.notes ?? null;
    }
    if (patch.tags !== undefined) {
      this.tags = patch.tags ?? [];
    }

    this.touch(now);
  }

  archive(now: Date) {
    if (!this.archivedAt) {
      this.archivedAt = now;
      this.touch(now);
    }
  }

  unarchive(now: Date) {
    if (this.archivedAt) {
      this.archivedAt = null;
      this.touch(now);
    }
  }

  get primaryEmail(): string | undefined {
    return this.contactPoints.find((cp) => cp.type === "EMAIL" && cp.isPrimary)?.value;
  }

  get primaryPhone(): string | undefined {
    return this.contactPoints.find((cp) => cp.type === "PHONE" && cp.isPrimary)?.value;
  }

  private setContactPoint(
    type: ContactPointType,
    value: string | null | undefined,
    generateId: () => string
  ) {
    if (value === undefined) return;

    const trimmed = value === null ? null : value.trim();
    const existingIndex = this.contactPoints.findIndex((cp) => cp.type === type);

    if (trimmed === null || trimmed === "") {
      if (existingIndex >= 0) {
        this.contactPoints.splice(existingIndex, 1);
      }
      return;
    }

    if (existingIndex >= 0) {
      const existing = this.contactPoints[existingIndex];
      this.contactPoints[existingIndex] = { ...existing, value: trimmed, isPrimary: true };
    } else {
      this.contactPoints.push({
        id: generateId(),
        type,
        value: trimmed,
        isPrimary: true,
      });
    }

    this.contactPoints = this.contactPoints.map((cp, index) => {
      if (cp.type !== type) return cp;
      return index === this.contactPoints.findIndex((p) => p.type === type)
        ? cp
        : { ...cp, isPrimary: false };
    });
  }

  private setBillingAddress(address: Address | null | undefined, generateId: () => string) {
    if (address === undefined) return;
    if (address === null) {
      this.billingAddress = null;
      return;
    }

    const currentId = this.billingAddress?.id;
    this.billingAddress = {
      ...address,
      id: currentId ?? address.id ?? generateId(),
      type: "BILLING",
      line1: address.line1,
      line2: address.line2 ?? null,
      city: address.city ?? null,
      postalCode: address.postalCode ?? null,
      country: address.country ?? null,
    };
  }

  private touch(now: Date) {
    this.updatedAt = now;
  }
}
