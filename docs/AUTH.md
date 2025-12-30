# Authentication & Identity System - Corely

## Overview

This document describes the complete authentication and identity management system for Corely, including multi-tenancy, RBAC, sessions, and audit logging.

## Architecture

### Bounded Context: Identity

The Identity context owns all authentication, authorization, and user management concerns. It follows:

- **Domain-Driven Design (DDD)**: Domain models, value objects, and events
- **Hexagonal Architecture**: Ports (interfaces) separate domain from infrastructure
- **Idempotency**: All write operations are idempotent
- **Outbox Pattern**: Domain events are persisted to Outbox for eventual consistency
- **Audit Logging**: All security-relevant actions are logged

### Key Concepts

#### Multi-Tenancy

- Users belong to multiple tenants via **Membership**
- Each tenant has independent roles, permissions, and data
- All API requests are tenant-scoped via `X-Tenant-Id` header or JWT token

#### RBAC (Role-Based Access Control)

- **Roles**: Tenant-specific roles (OWNER, ADMIN, MEMBER)
- **Permissions**: Global permissions that can be assigned to roles
- **RolePermission**: Links roles to permissions
- Default roles created automatically on tenant creation

#### Sessions & Tokens

- **Access Token**: Short-lived JWT (15 minutes default)
  - Contains: userId, email, tenantId
  - Used for API authentication
- **Refresh Token**: Long-lived token (30 days default)
  - Hashed and stored in database
  - Rotates on each refresh
  - Can be revoked

#### Outbox Pattern

- Domain events written to `OutboxEvent` table
- Worker service polls and publishes events
- Enables eventual consistency across bounded contexts
- Events: user.created, user.logged_in, tenant.created, membership.created, etc.

#### Audit Logging

- `AuditLog` records all security-relevant actions
- Fields: action, tenantId, userId, targetType, targetId, IP, userAgent, metadata
- Can be used for compliance and security analysis

## API Endpoints

### Public Endpoints

#### `POST /auth/signup`

Creates a new user and tenant.

**Request:**

```json
{
  "email": "user@example.com",
  "password": "MyPassword123",
  "tenantName": "My Company",
  "userName": "John Doe"
}
```

**Response:**

```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "tenantId": "uuid",
  "tenantName": "My Company",
  "membershipId": "uuid",
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

**Idempotency:**

- Header: `X-Idempotency-Key: <unique-key>`
- Returns cached response if called with same key within 24 hours

---

#### `POST /auth/login`

Authenticates a user.

**Request:**

```json
{
  "email": "user@example.com",
  "password": "MyPassword123",
  "tenantId": "optional-tenant-id"
}
```

**Response:**

```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "tenantId": "uuid",
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "memberships": [
    {
      "tenantId": "uuid",
      "tenantName": "My Company",
      "roleId": "uuid"
    }
  ]
}
```

If user has multiple tenants and no tenantId provided, memberships are returned for user to choose.

---

#### `POST /auth/refresh`

Refreshes access token using refresh token.

**Request:**

```json
{
  "refreshToken": "eyJhbGc..."
}
```

**Response:**

```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc..."
}
```

Refresh token is rotated automatically.

---

### Authenticated Endpoints

#### `GET /auth/me`

Returns current user and memberships.

**Headers:**

```
Authorization: Bearer <access-token>
```

**Response:**

```json
{
  "userId": "uuid",
  "email": "user@example.com",
  "name": "John Doe",
  "activeTenantId": "uuid",
  "memberships": [
    {
      "tenantId": "uuid",
      "tenantName": "My Company",
      "roleId": "uuid"
    }
  ]
}
```

---

#### `POST /auth/logout`

Revokes refresh tokens.

**Headers:**

```
Authorization: Bearer <access-token>
```

**Request:**

```json
{
  "refreshToken": "optional-specific-token-to-revoke"
}
```

**Response:**

```json
{
  "message": "Successfully logged out"
}
```

---

#### `POST /auth/switch-tenant`

Changes active tenant for the user.

**Headers:**

```
Authorization: Bearer <access-token>
```

**Request:**

```json
{
  "tenantId": "uuid"
}
```

**Response:**

```json
{
  "accessToken": "eyJhbGc...",
  "refreshToken": "eyJhbGc...",
  "tenantId": "uuid"
}
```

---

## Database Schema

### Core Models

#### `Tenant`

- id: String (PK)
- name: String
- slug: String (unique)
- status: String (ACTIVE | SUSPENDED | ARCHIVED)
- createdAt: DateTime

#### `User`

- id: String (PK)
- email: String (unique)
- passwordHash: String
- name: String (nullable)
- status: String (ACTIVE | INACTIVE | DELETED)
- createdAt: DateTime
- updatedAt: DateTime

#### `Membership`

- id: String (PK)
- tenantId: String (FK)
- userId: String (FK)
- roleId: String (FK)
- createdAt: DateTime
- Unique constraint: (tenantId, userId)

#### `Role`

- id: String (PK)
- tenantId: String (FK)
- name: String
- systemKey: String (nullable, enum: OWNER | ADMIN | MEMBER)
- createdAt: DateTime

#### `Permission`

- id: String (PK)
- key: String (unique)
- description: String
- createdAt: DateTime

#### `RolePermission`

- roleId: String (FK)
- permissionId: String (FK)
- Unique constraint: (roleId, permissionId)

#### `RefreshToken`

- id: String (PK)
- userId: String (FK)
- tenantId: String (FK)
- tokenHash: String (unique)
- revokedAt: DateTime (nullable)
- expiresAt: DateTime
- createdAt: DateTime

#### `ApiKey`

- id: String (PK)
- tenantId: String (FK)
- name: String
- keyHash: String
- lastUsedAt: DateTime (nullable)
- createdAt: DateTime

#### `AuditLog`

- id: String (PK)
- tenantId: String (nullable, FK)
- actorUserId: String (nullable, FK)
- action: String
- targetType: String (nullable)
- targetId: String (nullable)
- ip: String (nullable)
- userAgent: String (nullable)
- metadataJson: String (nullable)
- createdAt: DateTime

#### `OutboxEvent`

- id: String (PK)
- tenantId: String (FK)
- eventType: String
- payloadJson: String
- status: String (PENDING | SENT | FAILED)
- attempts: Int
- availableAt: DateTime
- createdAt: DateTime
- updatedAt: DateTime

## Code Structure

### API (services/api/src/modules/identity)

```
identity/
  ├── domain/                          # Pure business logic (framework-free)
  │   ├── entities/
  │   │   ├── user.entity.ts
  │   │   ├── tenant.entity.ts
  │   │   └── membership.entity.ts
  │   ├── value-objects/
  │   │   ├── email.vo.ts
  │   │   └── password.vo.ts
  │   └── events/
  │       └── identity.events.ts
  │
  ├── application/                     # Use cases, business logic orchestration
  │   ├── ports/                       # Interfaces (abstractions)
  │   │   ├── user.repo.port.ts
  │   │   ├── tenant.repo.port.ts
  │   │   ├── membership.repo.port.ts
  │   │   ├── refresh-token.repo.port.ts
  │   │   ├── role.repo.port.ts
  │   │   ├── password-hasher.port.ts
  │   │   ├── token-service.port.ts
  │   │   ├── outbox.port.ts
  │   │   ├── audit.port.ts
  │   │   └── clock.port.ts
  │   └── use-cases/                   # Business logic
  │       ├── sign-up.usecase.ts
  │       ├── sign-in.usecase.ts
  │       ├── refresh-token.usecase.ts
  │       ├── sign-out.usecase.ts
  │       └── switch-tenant.usecase.ts
  │
  ├── infrastructure/                  # Concrete implementations
  │   ├── persistence/
  │   │   ├── prisma.user.repo.ts
  │   │   ├── prisma.tenant.repo.ts
  │   │   ├── prisma.membership.repo.ts
  │   │   ├── prisma.refresh-token.repo.ts
  │   │   ├── prisma.role.repo.ts
  │   │   ├── prisma.audit.repo.ts
  │   │   └── prisma.outbox.adapter.ts
  │   └── security/
  │       ├── bcrypt.password-hasher.ts
  │       └── jwt.token-service.ts
  │
  ├── presentation/                    # HTTP layer
  │   └── http/
  │       ├── auth.controller.ts
  │       ├── auth.dto.ts
  │       ├── auth.guard.ts
  │       ├── rbac.guard.ts
  │       └── current-user.decorator.ts
  │
  └── identity.module.ts               # NestJS module
```

### Frontend (apps/web/src)

```
lib/
  ├── auth-client.ts                   # HTTP client for auth APIs
  └── auth-provider.tsx                # React context provider

routes/
  └── auth/
      ├── login.tsx                    # Login page
      └── signup.tsx                   # Signup page
```

## Default Permissions

When a new tenant is created, the system creates these permissions:

```
- tenant.manage       # Manage tenant settings
- user.invite         # Invite users to tenant
- invoice.write       # Create/edit invoices
- expense.write       # Create/edit expenses
- workflow.manage     # Manage workflows
- admin.access        # Admin panel access
```

## Default Roles

When a new tenant is created:

- **OWNER**: All permissions (can manage tenant, invite users, manage data, etc.)
- **ADMIN**: All except tenant.manage (can manage users and data)
- **MEMBER**: Limited to invoice.write and expense.write

The first user in a tenant automatically gets the OWNER role.

## Security Considerations

### Password Requirements

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one digit

### Token Management

- Access tokens are NOT stored; they're decoded in-memory
- Refresh tokens are hashed in database
- Refresh tokens can be individually revoked
- All tokens are user + tenant scoped
- Tokens include expiration times

### HTTPS

In production, ensure:

- All auth endpoints use HTTPS
- Set secure cookie flags (if using cookies)
- Use strong JWT secrets (change from defaults)
- Implement rate limiting on auth endpoints

### Cross-Tenant Access

- All queries are scoped by tenantId
- API guards verify user has membership in requested tenant
- Audit logs track access attempts

## Environment Variables

```bash
# JWT Configuration
JWT_ACCESS_SECRET=<change-in-production>
JWT_REFRESH_SECRET=<change-in-production>
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=30d

# Database
DATABASE_URL=postgresql://user:pass@localhost/db

# API
API_PORT=3000
```

## Testing Workflows

### 1. Sign Up

```bash
curl -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123",
    "tenantName": "Test Company",
    "userName": "Test User"
  }'
```

### 2. Sign In

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Password123"
  }'
```

### 3. Get Current User

```bash
curl -X GET http://localhost:3000/auth/me \
  -H "Authorization: Bearer <access-token>"
```

### 4. Refresh Token

```bash
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d '{
    "refreshToken": "<refresh-token>"
  }'
```

### 5. Logout

```bash
curl -X POST http://localhost:3000/auth/logout \
  -H "Authorization: Bearer <access-token>" \
  -H "Content-Type: application/json" \
  -d '{}'
```

### 6. Switch Tenant

```bash
curl -X POST http://localhost:3000/auth/switch-tenant \
  -H "Authorization: Bearer <access-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "tenantId": "<tenant-id>"
  }'
```

## Frontend Integration

### Setup

```typescript
import { AuthProvider } from '@/lib/auth-provider';

function App() {
  return (
    <AuthProvider>
      {/* Your app */}
    </AuthProvider>
  );
}
```

### Usage

```typescript
import { useAuth } from '@/lib/auth-provider';

function MyComponent() {
  const { user, isAuthenticated, signin, logout } = useAuth();

  return (
    <div>
      {isAuthenticated ? (
        <>
          <p>Welcome, {user?.email}</p>
          <button onClick={logout}>Logout</button>
        </>
      ) : (
        <p>Please sign in</p>
      )}
    </div>
  );
}
```

## Next Steps

### To Implement

1. Role-based access control UI
2. User invitation system
3. Permission management UI
4. Two-factor authentication
5. OAuth/OIDC integration
6. API key management for machine-to-machine auth
7. Session management UI
8. Audit log viewer

### Future Enhancements

- Social login (Google, GitHub, etc.)
- LDAP/Active Directory integration
- Single Sign-On (SSO)
- Risk-based authentication
- Biometric authentication
- Hardware security keys

## Troubleshooting

### "Invalid email or password"

- Verify credentials are correct
- Check user is active in database
- Check password hash matches

### "User has no memberships"

- User must be added to a tenant
- Check Membership records in database

### "Invalid or revoked refresh token"

- Refresh token may have expired
- Token may have been explicitly revoked
- User may have signed out from other device

### JWT Token Errors

- Check token format (should be Bearer token)
- Verify JWT secrets match
- Check token hasn't expired
- Check tenantId in token matches API header

## References

- [DDD (Domain-Driven Design)](https://martinfowler.com/bliki/DomainDrivenDesign.html)
- [Hexagonal Architecture](https://alistair.cockburn.us/hexagonal-architecture/)
- [Outbox Pattern](https://microservices.io/patterns/data/transactional-outbox.html)
- [JWT Best Practices](https://tools.ietf.org/html/rfc8949)
