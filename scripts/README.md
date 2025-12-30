# DI Integration Test Scripts

Automated scripts for running DI integration tests with external infrastructure.

## Available Scripts

### `test-di-full.sh` - Full Test Suite with Cleanup

Runs complete DI integration tests and cleans up afterward.

**What it does:**

1. Starts dedicated test infrastructure (Postgres on :5433, Redis on :6380)
2. Waits for services to be healthy
3. Runs database migrations
4. Executes all DI integration tests (unskips all tests)
5. Cleans up: stops services and removes temporary files

**Usage:**

```bash
# From repository root
./scripts/test-di-full.sh

# Keep services running after tests (for debugging)
CLEANUP=no ./scripts/test-di-full.sh
```

**When to use:**

- ✅ Before committing major DI changes
- ✅ In CI/CD pipeline
- ✅ Verifying full application DI wiring

---

### `test-di-dev.sh` - Development Mode (Keeps Services Running)

Optimized for rapid iteration during development.

**What it does:**

1. Checks if services are already running
2. Starts services only if needed (much faster on subsequent runs)
3. Runs DI integration tests
4. Leaves services running for next test run

**Usage:**

```bash
# From repository root
./scripts/test-di-dev.sh

# First run: ~30 seconds (starts services)
# Subsequent runs: ~5 seconds (reuses running services)
```

**When to use:**

- ✅ During active development of DI-related code
- ✅ Iterating on module wiring
- ✅ Testing DI fixes locally

**Stop services when done:**

```bash
docker-compose -f docker-compose.di-test.yml down -v
```

---

## Infrastructure Details

### Dedicated Test Infrastructure

Both scripts use `docker-compose.di-test.yml` which provides:

- **Postgres** (port 5433) - Isolated test database
- **Redis** (port 6380) - Isolated test cache

**Why different ports?**

- Avoids conflicts with your local development environment
- Allows running DI tests while dev server is running
- Clean separation between dev and test data

### Environment Variables

Tests use `.env.di-test` which configures:

- `DATABASE_URL=postgresql://corely:corely@localhost:5433/corely_test`
- `REDIS_URL=redis://localhost:6380`
- Test-specific JWT secrets
- Mock email provider

---

## Integration with Package Scripts

Add these to your workflow:

```bash
# Quick unit DI tests (no external deps)
pnpm test di-smoke

# Full integration DI tests (with infrastructure)
./scripts/test-di-full.sh

# Dev mode (fast iteration)
./scripts/test-di-dev.sh
```

---

## Troubleshooting

### "Services failed to become healthy"

**Check Docker logs:**

```bash
docker-compose -f docker-compose.di-test.yml logs
```

**Common causes:**

- Port 5433 or 6380 already in use
- Docker daemon not running
- Insufficient Docker resources

**Fix:**

```bash
# Check what's using the ports
lsof -i :5433
lsof -i :6380

# Kill conflicting processes or change ports in docker-compose.di-test.yml
```

### "Migration failed"

**Reset database:**

```bash
docker-compose -f docker-compose.di-test.yml down -v
./scripts/test-di-full.sh
```

### Tests pass in `test-di-full.sh` but fail in CI

**Verify CI uses same environment:**

- Check CI has `.env.di-test` configuration
- Ensure Docker Compose version matches
- Verify network connectivity between services

---

## Performance Tips

### First-time setup (~30s)

```bash
./scripts/test-di-full.sh
```

### Rapid iteration (<5s per run)

```bash
# Start once
./scripts/test-di-dev.sh

# Make code changes...

# Test again (reuses running services)
./scripts/test-di-dev.sh

# Repeat as needed...

# Clean up when done
docker-compose -f docker-compose.di-test.yml down -v
```

---

## What Tests Are Run

When infrastructure is available, these tests verify:

### Module Instantiation

- ✅ AppModule can be created
- ✅ PlatformModule can be created
- ✅ IdentityModule can be created

### Use Case Resolution

- ✅ EnableAppUseCase resolves with all dependencies
- ✅ SignUpUseCase resolves with all dependencies

### Singleton Behavior

- ✅ ID generator is same instance across modules
- ✅ Clock is same instance across modules

### Token Identity

- ✅ Tokens consistent across import paths

---

**Last Updated:** 2025-12-30
