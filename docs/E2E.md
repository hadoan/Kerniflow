# E2E Testing Guide for Corely

This document describes the End-to-End (E2E) testing infrastructure for Corely, including how to run tests locally, in CI/CD pipelines, and how the test harness works.

## Overview

The E2E testing system uses:

- **Playwright**: Browser-based test automation
- **Docker Compose**: Full-stack environment (Postgres + Redis + API + Worker)
- **Test Harness API**: Deterministic test data management (seed, reset, drain-outbox)
- **Node.js `NODE_ENV=test`**: Special testing mode for API/Worker

## Quick Start (Local Development)

### 1. Start the E2E Stack

```bash
pnpm e2e:up
```

This starts:

- PostgreSQL (port 5433)
- Redis (port 6380)
- API service (port 3000, NODE_ENV=test)
- Worker service (NODE_ENV=test)

Wait for healthchecks to pass:

```bash
docker compose -f docker-compose.e2e.yml ps
# All services should show "healthy"
```

### 2. Run Tests

In a separate terminal:

```bash
# Run all tests
pnpm e2e

# Run tests in UI mode (interactive)
pnpm e2e:ui

# View test report
pnpm e2e:report
```

### 3. Shutdown Stack

```bash
pnpm e2e:down
```

This removes all volumes and containers.

---

## Test Harness Endpoints

The test harness is a set of REST API endpoints that **only exist in `NODE_ENV=test`** and require a secret header.

### Authentication

All test harness requests require:

```
Header: X-Test-Secret: <TEST_HARNESS_SECRET>
```

The secret is configured via environment variable in `docker-compose.e2e.yml`:

```yaml
environment:
  TEST_HARNESS_SECRET: test-secret-key
```

### Endpoints

#### `POST /test/seed`

**Purpose**: Create a new tenant with a test user, roles, and permissions.

**Request**:

```json
{
  "email": "e2e-test@corely.local",
  "password": "E2ETestPassword123!",
  "tenantName": "E2E Test Tenant"
}
```

**Response**:

```json
{
  "tenantId": "cuid123...",
  "tenantName": "E2E Test Tenant",
  "userId": "cuid456...",
  "userName": "Test User",
  "email": "e2e-test@corely.local"
}
```

**Usage in Tests**:

```typescript
import { seedTestData } from "../utils/testData";

const testData = await seedTestData();
// testData contains tenant, user, and login credentials
```

#### `POST /test/reset`

**Purpose**: Clear tenant-scoped data (expenses, invoices, audit logs, outbox events) while preserving tenant/user/roles.

**Request**:

```json
{
  "tenantId": "cuid123..."
}
```

**Response**:

```json
{
  "success": true,
  "message": "Tenant data reset successfully"
}
```

**Usage in Tests**:

```typescript
import { resetTestData } from "../utils/testData";

// After a test
await resetTestData(testData.tenant.id);
```

#### `POST /test/drain-outbox`

**Purpose**: Process all pending outbox events once, deterministically.

This is critical for testing workflows that emit events (e.g., "expense created → audit log written").

**Request**: (no body required)

```json
{}
```

**Response**:

```json
{
  "success": true,
  "processedCount": 5,
  "failedCount": 0
}
```

**Usage in Tests**:

```typescript
import { drainOutbox } from "../utils/testData";

// After creating an expense
await drainOutbox();

// Now verify audit effects
```

#### `POST /test/health`

**Purpose**: Simple health check (for debugging).

---

## Test Structure

### Location

```
apps/e2e/
├── package.json
├── playwright.config.ts
├── tests/
│   ├── fixtures.ts           # Custom fixtures (test data setup)
│   ├── auth.spec.ts          # Authentication tests
│   ├── expenses.spec.ts      # Expense CRUD tests
│   ├── invoices.spec.ts      # Invoice workflow tests
│   └── assistant.spec.ts     # AI Assistant tests
└── utils/
    ├── api.ts                # HTTP client for test harness
    ├── globalSetup.ts        # Global setup (seed & login once)
    ├── selectors.ts          # Centralized test IDs
    ├── testData.ts           # Test data helpers
    └── storageState.json     # Auto-generated auth state
```

### Writing Tests

Use the `test` function from `fixtures.ts` instead of `@playwright/test`:

```typescript
import { test, expect } from "./fixtures";

test("should do something", async ({ page, testData }) => {
  // testData is automatically seeded before each test
  // testData.user.email, testData.user.password, testData.tenant.id available

  // Navigate and interact
  await page.goto("/expenses");

  // Expect patterns
  await expect(page.locator("text=Create")).toBeVisible();
});
```

**Key fixture features**:

1. **testData** is seeded before each test via `/test/seed`
2. **testData** is reset after each test via `/test/reset`
3. Data is isolated per test (no cross-test pollution)

### Selectors

Avoid brittle CSS selectors. Use `data-testid` attributes instead:

```typescript
import { selectors } from "../utils/selectors";

// ✓ Good: using centralized selectors
await page.fill(selectors.auth.loginEmailInput, email);

// ✗ Avoid: brittle CSS selectors
await page.fill('input[class*="email"][class*="form"]', email);
```

See `utils/selectors.ts` for the complete list of test IDs.

---

## Deterministic Testing: Outbox & Workflows

### The Problem

Tests must not depend on timing or external events. If a test creates an expense that emits an event, and the worker processes it asynchronously, the test becomes flaky.

### The Solution: Drain Outbox

Instead of waiting for the worker to run, tests call `/test/drain-outbox` explicitly:

```typescript
test("should create expense and update audit log", async ({ page, testData }) => {
  // 1. Create expense via UI
  await page.fill(selectors.expenses.amountInput, "50");
  await page.click(selectors.expenses.submitButton);

  // 2. Wait for UI confirmation
  await expect(page.locator(selectors.expenses.successMessage)).toBeVisible();

  // 3. Drain outbox to process events deterministically
  const result = await drainOutbox();
  expect(result.processedCount).toBeGreaterThan(0);

  // 4. Now audit log is guaranteed to exist
  // (if implemented as an outbox event)
});
```

### How It Works

1. When an expense is created, an `OutboxEvent` is inserted (status=PENDING)
2. Test calls `/test/drain-outbox`
3. API fetches all PENDING events and marks them SENT
4. Test can now assert the effects (audit log, etc.)

**No worker needed**. The drain endpoint handles event processing inline.

---

## Frontend Test IDs

Key components have `data-testid` attributes for robust selectors:

### Authentication

- `input[data-testid="login-email"]`
- `input[data-testid="login-password"]`
- `button[data-testid="login-submit"]`

### Navigation

- `nav[data-testid="sidebar-nav"]`
- `a[data-testid="nav-expenses"]`
- `a[data-testid="nav-invoices"]`
- `a[data-testid="nav-assistant"]`
- `button[data-testid="user-menu-trigger"]`
- `div[data-testid="user-menu"]`

### Expenses

- `button[data-testid="create-expense-button"]`
- `div[data-testid="expenses-list"]`
- `tr[data-testid="expense-row-{id}"]`

### Invoices

- `button[data-testid="create-invoice-button"]`
- `div[data-testid="invoices-list"]`
- `tr[data-testid="invoice-row-{id}"]`
- `span[data-testid="invoice-status-draft"]`
- `span[data-testid="invoice-status-issued"]`

### Assistant

- `div[data-testid="assistant-chat"]`
- `div[data-testid="assistant-messages"]`
- `input[data-testid="assistant-input"]`
- `button[data-testid="assistant-submit"]`
- `button[data-testid="assistant-confirm"]`

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - uses: actions/setup-node@v3
        with:
          node-version: "22"

      - name: Install pnpm
        uses: pnpm/action-setup@v2

      - name: Install dependencies
        run: pnpm install

      - name: Start E2E stack
        run: pnpm e2e:up

      - name: Wait for services
        run: |
          sleep 10
          docker compose -f docker-compose.e2e.yml ps

      - name: Run E2E tests
        run: pnpm e2e

      - name: Upload report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: playwright-report
          path: apps/e2e/playwright-report/

      - name: Cleanup
        if: always()
        run: pnpm e2e:down
```

### Environment Variables

In CI, set:

```bash
CI=true
NODE_ENV=test
DATABASE_URL=postgresql://corely:corely@postgres:5432/corely_e2e?schema=public
REDIS_URL=redis://redis:6379
TEST_HARNESS_SECRET=test-secret-key
JWT_SECRET=test-jwt-secret-change-me
```

(Most are already set in `docker-compose.e2e.yml`)

---

## Troubleshooting

### Services Won't Start

```bash
# Check Docker Desktop is running
docker ps

# View logs
docker compose -f docker-compose.e2e.yml logs -f

# Check healthchecks
docker compose -f docker-compose.e2e.yml ps

# Rebuild images
docker compose -f docker-compose.e2e.yml up --build
```

### Test Times Out

- Ensure all services are healthy: `docker compose -f docker-compose.e2e.yml ps`
- Check API is responding: `curl -i http://localhost:3000/health`
- Increase timeout in `playwright.config.ts`: `timeout: 120_000`

### Authentication Fails

- Verify `globalSetup.ts` ran successfully
- Check `utils/storageState.json` exists
- Ensure test harness endpoints are accessible:

```bash
curl -X POST http://localhost:3000/test/health \
  -H "X-Test-Secret: test-secret-key"
```

### Database State Issues

1. Reset volumes: `pnpm e2e:down && pnpm e2e:up`
2. Or manually:

```bash
docker compose -f docker-compose.e2e.yml exec postgres \
  dropdb -U corely corely_e2e && createdb -U corely corely_e2e
```

### Port Already in Use

Change `docker-compose.e2e.yml`:

```yaml
postgres:
  ports:
    - "5434:5432" # Changed from 5433

redis:
  ports:
    - "6381:6379" # Changed from 6380
```

Update `playwright.config.ts`:

```typescript
const baseURL = "http://localhost:5173"; // Web app port
```

---

## Best Practices

### ✓ Do

- Use `data-testid` selectors, not CSS classes
- Call `/test/reset` after each test (or use fixtures)
- Call `/test/drain-outbox` before asserting outbox effects
- Run tests locally before pushing
- Use `pnpm e2e:ui` for debugging
- Keep tests focused on critical user flows

### ✗ Don't

- Don't rely on real timing (sleeps, races)
- Don't share state between tests
- Don't test implementation details
- Don't change business logic for testing
- Don't run tests against production

---

## Test Coverage

Current E2E test suite covers:

| Module        | Tests                                       |
| ------------- | ------------------------------------------- |
| **Auth**      | Login, user menu, redirects                 |
| **Expenses**  | Create, list, drain-outbox                  |
| **Invoices**  | Create draft, list, issue, drain-outbox     |
| **Assistant** | Chat interface, tool cards, confirm actions |

### Adding Tests

1. Create `tests/myfeature.spec.ts`
2. Import fixtures and selectors:

```typescript
import { test, expect } from "./fixtures";
import { selectors } from "../utils/selectors";
```

3. Write test with `test()` from fixtures
4. Use centralized selectors
5. Call `drainOutbox()` after state-changing actions
6. Run locally: `pnpm e2e`

---

## Performance

- Tests run in parallel (Chromium, Firefox)
- ~2-5 minutes for full suite locally
- ~5-10 minutes in CI (with build overhead)

To speed up:

```bash
# Run only one browser
npx playwright test --project=chromium

# Run one test file
pnpm e2e -- tests/auth.spec.ts

# Debug a test
pnpm e2e:ui
```

---

## References

- [Playwright Documentation](https://playwright.dev)
- [Docker Compose Docs](https://docs.docker.com/compose/)
- [Corely Architecture](./overall-structure.md)
- [API Documentation](../services/api/README.md)

---

## Definition of Success

✓ `pnpm e2e:up` starts services and passes healthchecks
✓ `pnpm e2e` runs tests reliably
✓ Tests are deterministic (no random waits)
✓ Test harness guarded by `NODE_ENV=test` and secret header
✓ No business logic changes; only test scaffolding
