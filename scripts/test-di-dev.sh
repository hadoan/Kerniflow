#!/bin/bash

# DI Integration Test Runner (Development Mode)
# Keeps services running for faster iteration

set -e  # Exit on error

# Set PATH early
export PATH="/opt/homebrew/bin:/usr/bin:$PATH"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

COMPOSE_FILE="docker-compose.di-test.yml"

echo -e "${BLUE}=== DI Integration Test (Dev Mode) ===${NC}\n"

# Check if services are running
POSTGRES_RUNNING=$(docker ps --filter "name=corely_postgres_di_test" --filter "status=running" -q)
REDIS_RUNNING=$(docker ps --filter "name=corely_redis_di_test" --filter "status=running" -q)

if [ -z "$POSTGRES_RUNNING" ] || [ -z "$REDIS_RUNNING" ]; then
  echo -e "${YELLOW}Starting services...${NC}"
  docker-compose -f "$COMPOSE_FILE" up -d

  echo "Waiting for services to be healthy..."
  sleep 8

  echo -e "${YELLOW}Running migrations...${NC}"
  export DATABASE_URL="postgresql://corely:corely@localhost:5433/corely?schema=public"
  pnpm --filter @corely/data exec prisma migrate deploy
else
  echo -e "${GREEN}✓ Services already running${NC}"
fi

# Create temporary integration test
TEST_FILE="services/api/src/__tests__/di-smoke.test.ts"
INT_TEST_FILE="services/api/src/__tests__/di-smoke.int.test.ts"

cp "$TEST_FILE" "$INT_TEST_FILE"
if [[ "$OSTYPE" == "darwin"* ]]; then
  sed -i '' 's/it\.skip(/it(/g' "$INT_TEST_FILE"
else
  sed -i 's/it\.skip(/it(/g' "$INT_TEST_FILE"
fi

# Run tests
echo -e "\n${YELLOW}Running tests...${NC}"
export DATABASE_URL="postgresql://corely:corely@localhost:5433/corely?schema=public"
export REDIS_URL="redis://localhost:6380"

pnpm test:int

# Cleanup temp file
rm -f "$INT_TEST_FILE"

echo -e "\n${GREEN}✓ Done (services still running)${NC}"
echo "To stop: docker-compose -f $COMPOSE_FILE down -v"
