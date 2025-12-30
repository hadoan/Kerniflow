#!/bin/bash

# DI Integration Test Runner
# Starts dedicated test infrastructure and runs full DI tests

set -e  # Exit on error

# Set PATH early for all commands
export PATH="/opt/homebrew/bin:/usr/bin:$PATH"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
COMPOSE_FILE="docker-compose.di-test.yml"
CLEANUP=${CLEANUP:-"yes"}  # Set CLEANUP=no to keep services running

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   DI Integration Test Runner              ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}\n"

# Function to cleanup on exit
cleanup() {
  if [ "$CLEANUP" = "yes" ]; then
    echo -e "\n${YELLOW}Cleaning up...${NC}"
    docker-compose -f "$COMPOSE_FILE" down -v 2>/dev/null || true
    rm -f services/api/src/__tests__/di-smoke.int.test.ts
    echo -e "${GREEN}✓ Cleanup complete${NC}"
  else
    echo -e "\n${YELLOW}Services left running (CLEANUP=no)${NC}"
    echo "To stop: docker-compose -f $COMPOSE_FILE down -v"
  fi
}

# Trap exit to cleanup
trap cleanup EXIT

# Step 1: Start services
echo -e "${YELLOW}[1/5] Starting test infrastructure...${NC}"
docker-compose -f "$COMPOSE_FILE" down -v 2>/dev/null || true  # Clean start
docker-compose -f "$COMPOSE_FILE" up -d

# Step 2: Wait for services to be healthy
echo -e "${YELLOW}[2/5] Waiting for services to be healthy...${NC}"
MAX_RETRIES=30
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
  POSTGRES_HEALTHY=$(docker inspect corely_postgres_di_test --format='{{.State.Health.Status}}' 2>/dev/null || echo "")
  REDIS_HEALTHY=$(docker inspect corely_redis_di_test --format='{{.State.Health.Status}}' 2>/dev/null || echo "")

  if [ "$POSTGRES_HEALTHY" = "healthy" ] && [ "$REDIS_HEALTHY" = "healthy" ]; then
    echo -e "${GREEN}      ✓ Postgres: healthy${NC}"
    echo -e "${GREEN}      ✓ Redis: healthy${NC}"
    break
  fi

  RETRY_COUNT=$((RETRY_COUNT + 1))
  printf "      "
  [ -n "$POSTGRES_HEALTHY" ] && printf "Postgres: $POSTGRES_HEALTHY  " || printf "Postgres: starting  "
  [ -n "$REDIS_HEALTHY" ] && printf "Redis: $REDIS_HEALTHY" || printf "Redis: starting"
  printf " ($RETRY_COUNT/$MAX_RETRIES)\r"
  sleep 2
done

echo ""  # New line after progress

if [ $RETRY_COUNT -eq $MAX_RETRIES ]; then
  echo -e "${RED}      ✗ Services failed to become healthy${NC}"
  docker-compose -f "$COMPOSE_FILE" ps
  docker-compose -f "$COMPOSE_FILE" logs
  exit 1
fi

# Step 3: Run migrations
echo -e "${YELLOW}[3/5] Running database migrations...${NC}"
export DATABASE_URL="postgresql://corely:corely@localhost:5433/corely?schema=public"

if pnpm --filter @corely/data exec prisma migrate deploy; then
  echo -e "${GREEN}      ✓ Migrations applied${NC}"
else
  echo -e "${RED}      ✗ Migration failed${NC}"
  exit 1
fi

# Step 4: Prepare integration tests
echo -e "${YELLOW}[4/5] Preparing integration test suite...${NC}"
TEST_FILE="services/api/src/__tests__/di-smoke.test.ts"
INT_TEST_FILE="services/api/src/__tests__/di-smoke.int.test.ts"

# Copy and modify the test file to unskip tests
cp "$TEST_FILE" "$INT_TEST_FILE"
# Remove .skip from all tests
if [[ "$OSTYPE" == "darwin"* ]]; then
  sed -i '' 's/it\.skip(/it(/g' "$INT_TEST_FILE"
else
  sed -i 's/it\.skip(/it(/g' "$INT_TEST_FILE"
fi

echo -e "${GREEN}      ✓ Integration test suite ready${NC}"

# Step 5: Run tests
echo -e "${YELLOW}[5/5] Running DI integration tests...${NC}"
export REDIS_URL="redis://localhost:6380"

echo ""
if pnpm test:int; then
  echo ""
  echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║   ✓ All DI Integration Tests Passed      ║${NC}"
  echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
  TEST_RESULT=0
else
  echo ""
  echo -e "${RED}╔════════════════════════════════════════════╗${NC}"
  echo -e "${RED}║   ✗ DI Integration Tests Failed           ║${NC}"
  echo -e "${RED}╚════════════════════════════════════════════╝${NC}"
  TEST_RESULT=1
fi

exit $TEST_RESULT
