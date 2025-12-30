# DI Testing Guide

## Overview

The DI smoke tests verify that NestJS dependency injection is correctly wired across all modules. There are two types of tests:

1. **Unit DI Tests** (Fast, no external deps) - Currently active
2. **Integration DI Tests** (Requires Postgres, Redis) - Currently skipped

## Running Unit DI Tests (No External Dependencies)

These tests verify token identity and basic kernel module functionality:

```bash
# From repository root
export PATH="/opt/homebrew/bin:/usr/bin:$PATH"
pnpm test di-smoke
```

**What it tests:**

- ✅ Token identity consistency across import paths
- ✅ KernelModule provides kernel services
- ✅ Token values match expected strings

**Duration:** ~3 seconds

---

## Running Full Integration DI Tests (With External Dependencies)

These tests verify that modules can be fully instantiated with real infrastructure.

### Prerequisites

You need Postgres and Redis running. Use the local Docker Compose setup:

```bash
# Start external services
docker-compose -f docker-compose.local.yml up -d

# Verify services are healthy
docker-compose -f docker-compose.local.yml ps

# Expected output:
# corely_postgres   running (healthy)
# corely_redis      running (healthy)
```

### Running the Tests

**Option 1: Create Integration Test File**

Create a separate file for integration DI tests:

```bash
# Copy the smoke test to an integration test
cp services/api/src/__tests__/di-smoke.test.ts \
   services/api/src/__tests__/di-smoke.int.test.ts
```

Then edit `services/api/src/__tests__/di-smoke.int.test.ts`:

- Remove all `.skip` from tests
- Add comment at top: `// Requires Postgres + Redis from docker-compose.local.yml`

Run with:

```bash
pnpm test:int
```

**Option 2: Temporarily Unskip Tests**

Edit `services/api/src/__tests__/di-smoke.test.ts` and change:

```typescript
it.skip("should create AppModule without DI errors", async () => {
```

to:

```typescript
it.only("should create AppModule without DI errors", async () => {
```

Run with:

```bash
pnpm test di-smoke
```

**Remember to revert after testing!**

---

## Test Breakdown

### Unit Tests (Always Run)

| Test                                | What It Verifies                                                             |
| ----------------------------------- | ---------------------------------------------------------------------------- |
| Token Identity (ID_GENERATOR_TOKEN) | Token imports from `@corely/kernel` and `shared/ports` resolve to same value |
| Token Identity (AUDIT_PORT)         | Audit port token consistent across imports                                   |
| KernelModule Instantiation          | KernelModule can be created and provides kernel services                     |

### Integration Tests (Currently Skipped)

| Test                         | What It Verifies                    | Requires        |
| ---------------------------- | ----------------------------------- | --------------- |
| AppModule Instantiation      | Full application can boot           | Postgres, Redis |
| PlatformModule Instantiation | Platform features work              | Postgres        |
| IdentityModule Instantiation | Auth system works                   | Postgres        |
| EnableAppUseCase Resolution  | Critical platform use case resolves | Postgres        |
| SignUpUseCase Resolution     | Critical identity use case resolves | Postgres        |
| ID Generator Singleton       | Same instance across modules        | Postgres        |
| Clock Singleton              | Same instance across modules        | Postgres        |

---

## Managing External Services

### Start Services

```bash
docker-compose -f docker-compose.local.yml up -d
```

### Stop Services

```bash
docker-compose -f docker-compose.local.yml down
```

### Clean All Data (Fresh Start)

```bash
docker-compose -f docker-compose.local.yml down -v
docker-compose -f docker-compose.local.yml up -d
pnpm migrate
```

### View Logs

```bash
# All services
docker-compose -f docker-compose.local.yml logs -f

# Postgres only
docker-compose -f docker-compose.local.yml logs -f postgres

# Redis only
docker-compose -f docker-compose.local.yml logs -f redis
```

---

## Recommended Workflow

### For Local Development (Default)

Run unit DI tests (fast, no deps):

```bash
pnpm test di-smoke
```

### Before Committing Major DI Changes

1. Start infrastructure:

   ```bash
   docker-compose -f docker-compose.local.yml up -d
   pnpm migrate
   ```

2. Create integration test file:

   ```bash
   cp services/api/src/__tests__/di-smoke.test.ts \
      services/api/src/__tests__/di-smoke.int.test.ts
   # Edit to remove .skip
   ```

3. Run integration tests:

   ```bash
   pnpm test:int
   ```

4. Stop infrastructure:
   ```bash
   docker-compose -f docker-compose.local.yml down
   ```

### In CI/CD Pipeline

Use the e2e setup which already starts infrastructure:

```bash
pnpm e2e:up
pnpm test:int
pnpm e2e:down
```

---

## Troubleshooting

### "Cannot read properties of undefined (reading 'REDIS_URL')"

**Cause:** Redis is not running or `REDIS_URL` is not set in `.env.test`

**Fix:**

1. Start Redis: `docker-compose -f docker-compose.local.yml up -d redis`
2. Verify `.env.test` has: `REDIS_URL=redis://localhost:6379`

### "Test timed out in 5000ms"

**Cause:** Postgres is not running or migrations not applied

**Fix:**

1. Start Postgres: `docker-compose -f docker-compose.local.yml up -d postgres`
2. Run migrations: `pnpm migrate`

### Tests Pass Locally but Fail in CI

**Cause:** CI environment might have different service URLs

**Fix:**

- Ensure CI uses same `.env.test` configuration
- Check CI logs for actual error messages
- Verify docker-compose services are healthy before running tests

---

## Future Enhancements

### Recommended: Separate Integration Tests

Create `di-smoke.int.test.ts` with full infrastructure tests:

```typescript
// services/api/src/__tests__/di-smoke.int.test.ts
/**
 * DI Integration Tests
 *
 * Requires external infrastructure:
 * - Postgres (via docker-compose.local.yml)
 * - Redis (via docker-compose.local.yml)
 *
 * Run: pnpm test:int
 */

describe("DI Integration Tests", () => {
  describe("Full Module Instantiation", () => {
    it("should create AppModule with real infrastructure", async () => {
      const module: TestingModule = await Test.createTestingModule({
        imports: [AppModule],
      }).compile();

      expect(module).toBeDefined();
    });

    // ... all the currently skipped tests
  });
});
```

Then update [package.json](../../package.json):

```json
{
  "scripts": {
    "test:di": "pnpm test di-smoke",
    "test:di:full": "docker-compose -f docker-compose.local.yml up -d && pnpm migrate && pnpm test:int && docker-compose -f docker-compose.local.yml down"
  }
}
```

---

**Last Updated:** 2025-12-30
