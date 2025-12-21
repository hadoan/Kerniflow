/**
 * Tenant Entity (Bounded Context root aggregate)
 * Represents a tenant/workspace/company
 */
export class Tenant {
  private constructor(
    private readonly id: string,
    private readonly name: string,
    private readonly slug: string,
    private readonly status: string,
    private readonly createdAt: Date,
    private readonly timeZone: string
  ) {}

  static create(
    id: string,
    name: string,
    slug: string,
    status: string = "ACTIVE",
    createdAt: Date = new Date(),
    timeZone: string = "UTC"
  ): Tenant {
    if (!name || name.trim().length === 0) {
      throw new Error("Tenant name cannot be empty");
    }

    if (!slug || slug.trim().length === 0) {
      throw new Error("Tenant slug cannot be empty");
    }

    const normalizedSlug = this.normalizeSlug(slug);
    return new Tenant(id, name.trim(), normalizedSlug, status, createdAt, timeZone);
  }

  static restore(data: {
    id: string;
    name: string;
    slug: string;
    status: string;
    createdAt: Date;
    timeZone: string;
  }): Tenant {
    return new Tenant(data.id, data.name, data.slug, data.status, data.createdAt, data.timeZone);
  }

  private static normalizeSlug(slug: string): string {
    return slug
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  getId(): string {
    return this.id;
  }

  getName(): string {
    return this.name;
  }

  getSlug(): string {
    return this.slug;
  }

  getStatus(): string {
    return this.status;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getTimeZone(): string {
    return this.timeZone;
  }

  isActive(): boolean {
    return this.status === "ACTIVE";
  }
}
