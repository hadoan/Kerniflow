# Environment Configuration

This project uses separate environment files for different deployment modes to keep sensitive keys and configuration secure.

## Quick Start

### 1. Development Environment

```bash
# Copy the example file
cp .env.dev.example .env.dev

# Edit .env.dev and add your actual API keys
# Required keys for development:
# - RESEND_API_KEY (for email sending)
# - OPENAI_API_KEY or ANTHROPIC_API_KEY (for AI features)
# - GOOGLE_APPLICATION_CREDENTIALS (if using GCS for storage)

# Start the development environment
docker compose -f docker-compose.dev.yml --env-file .env.dev up -d
```

The dev environment will be available at:

- Web: http://localhost:5173
- API: http://localhost:3000
- API Docs: http://localhost:3000/docs
- Postgres: localhost:5432
- Redis: localhost:6379

### 2. E2E Test Environment

```bash
# Copy the example file
cp .env.e2e.example .env.e2e

# Edit .env.e2e and add your actual API keys
# Note: You can use dummy keys for most services during e2e tests
# unless you're specifically testing those integrations

# Start the e2e environment
docker compose -f docker-compose.e2e.yml --env-file .env.e2e up -d

# Run e2e tests
cd apps/e2e
pnpm e2e
```

The e2e environment uses different ports to avoid conflicts:

- Web: http://localhost:5173
- API: http://localhost:3000
- Postgres: localhost:5433 (database: `corely_e2e`)
- Redis: localhost:6380

## Environment Files

### File Structure

```
.env.example         # Legacy example file (kept for compatibility)
.env.dev.example     # Development environment template
.env.e2e.example     # E2E test environment template
.env.dev             # Your actual dev secrets (gitignored)
.env.e2e             # Your actual e2e secrets (gitignored)
```

### What Gets Committed

✅ **Committed to git:**

- `.env.example`
- `.env.dev.example`
- `.env.e2e.example`

❌ **NOT committed to git (in .gitignore):**

- `.env`
- `.env.dev`
- `.env.e2e`

## Required Environment Variables

### Development (.env.dev)

**Required for basic functionality:**

- `RESEND_API_KEY` - Email sending (get from https://resend.com)
- `JWT_SECRET` - Should be a strong random string in production

**Required for AI features:**

- `OPENAI_API_KEY` - If using OpenAI (get from https://platform.openai.com)
- `ANTHROPIC_API_KEY` - If using Anthropic Claude (get from https://console.anthropic.com)

**Required for storage (if using GCS):**

- `GOOGLE_CLOUD_PROJECT` - Your GCP project ID
- `GOOGLE_APPLICATION_CREDENTIALS` - Path to your GCP service account JSON

### E2E Testing (.env.e2e)

For e2e tests, you can typically use dummy values unless testing specific integrations:

```bash
# Example .env.e2e with dummy values
RESEND_API_KEY=dummy-key-for-e2e
OPENAI_API_KEY=dummy-key-for-e2e
ANTHROPIC_API_KEY=dummy-key-for-e2e
```

## How It Works

Docker Compose loads environment variables in this order (later values override earlier):

1. Environment variables from your shell
2. Variables from the `env_file` directive (e.g., `.env.dev`)
3. Variables defined in the `environment` section

This means:

- Shared configuration goes in `.env.dev.example` / `.env.e2e.example`
- Your secrets go in `.env.dev` / `.env.e2e` (gitignored)
- You can override any value from your shell if needed

## Switching Between Environments

You can run both dev and e2e environments simultaneously since they use different ports:

```bash
# Start dev environment
docker compose -f docker-compose.dev.yml --env-file .env.dev up -d

# Start e2e environment (different ports)
docker compose -f docker-compose.e2e.yml --env-file .env.e2e up -d

# Stop a specific environment
docker compose -f docker-compose.dev.yml down
docker compose -f docker-compose.e2e.yml down
```

## Troubleshooting

### "File not found: .env.dev"

You need to create the file first:

```bash
cp .env.dev.example .env.dev
```

### "RESEND_API_KEY environment variable is required"

Edit your `.env.dev` or `.env.e2e` file and add a valid API key, or use a dummy value:

```bash
RESEND_API_KEY=dummy-key-for-testing
```

### Changes to .env.dev not taking effect

Restart the docker containers with the env file:

```bash
docker compose -f docker-compose.dev.yml --env-file .env.dev restart
```

## Security Best Practices

1. ✅ **DO** keep your `.env.dev` and `.env.e2e` files local only
2. ✅ **DO** use strong, unique secrets for production deployments
3. ✅ **DO** rotate API keys regularly
4. ❌ **DON'T** commit files with real API keys
5. ❌ **DON'T** share your `.env.dev` file in Slack/email
6. ❌ **DON'T** use production keys in development

## Example Workflow

```bash
# First time setup
cp .env.dev.example .env.dev
# Edit .env.dev with your actual keys

# Daily development
docker compose -f docker-compose.dev.yml --env-file .env.dev up -d
# Make changes, hot reload works automatically

# Before committing
# Make sure you haven't accidentally modified .env.dev.example with secrets

# Running tests
cp .env.e2e.example .env.e2e
docker compose -f docker-compose.e2e.yml --env-file .env.e2e up -d
cd apps/e2e && pnpm e2e
```
