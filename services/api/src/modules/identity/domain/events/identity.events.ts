/**
 * Domain Events for Identity Bounded Context
 * These events trigger outbox entries and can be consumed by other contexts
 */

export abstract class DomainEvent {
  constructor(
    public readonly eventType: string,
    public readonly tenantId: string | null,
    public readonly aggregateId: string,
    public readonly timestamp: Date = new Date()
  ) {}
}

export class UserCreatedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly email: string,
    public readonly name: string | null,
    tenantId: string | null = null
  ) {
    super("identity.user.created", tenantId, userId);
  }
}

export class TenantCreatedEvent extends DomainEvent {
  constructor(
    public readonly tenantId: string,
    public readonly name: string,
    public readonly slug: string
  ) {
    super("identity.tenant.created", tenantId, tenantId);
  }
}

export class UserLoggedInEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly tenantId: string,
    public readonly email: string
  ) {
    super("identity.user.logged_in", tenantId, userId);
  }
}

export class MembershipCreatedEvent extends DomainEvent {
  constructor(
    public readonly membershipId: string,
    public readonly tenantId: string,
    public readonly userId: string,
    public readonly roleId: string
  ) {
    super("identity.membership.created", tenantId, membershipId);
  }
}

export class RefreshTokenIssuedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly tenantId: string
  ) {
    super("identity.refresh_token.issued", tenantId, userId);
  }
}

export class UserLoggedOutEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly tenantId: string
  ) {
    super("identity.user.logged_out", tenantId, userId);
  }
}

export class TenantSwitchedEvent extends DomainEvent {
  constructor(
    public readonly userId: string,
    public readonly fromTenantId: string,
    public readonly toTenantId: string
  ) {
    super("identity.tenant.switched", toTenantId, userId);
  }
}
