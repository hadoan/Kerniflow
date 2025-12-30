# Configuration Guide

This document explains how environment configuration works in Corely and how to manage environment variables across local development, testing, and production environments.

## Overview

Corely uses a centralized configuration system powered by the `@corely/config` package. This provides:

- **Type-safe access** to environment variables via `EnvService`
- **Automatic validation** with clear error messages on startup
- **Environment file support** for local development (`.env`, `.env.dev`, etc.)
- **Production-ready** configuration via injected environment variables
- **Testing support** with easy override capabilities

## How It Works

### Environment Resolution

The configuration system uses the following precedence order (highest to lowest):

1. **Actual `process.env` variables** (always win)
2. `.env.<APP_ENV>.local` (e.g., `.env.dev.local`)
3. `.env.<APP_ENV>` (e.g., `.env.dev`, `.env.prod`)
4. `.env.local`
5. `.env`

This means:

- Real environment variables always take precedence
- More specific files override less specific ones
- Local overrides (`.local` files) are never committed to git

### Local vs Production Behavior

**Local Development (default):**

- Automatically loads `.env*` files from the monorepo root
- Falls back to defaults for optional variables
- Validates all required variables on startup

**Production / Cloud Run / Containers:**

- Skips `.env` file loading entirely
- Uses only environment variables injected by the platform
- Still validates all required variables on startup
- Fails fast with clear errors if config is invalid

Detection: The system considers it "production" if:

- `NODE_ENV === "production"`, OR
- `K_SERVICE` is set (Cloud Run), OR
- `KUBERNETES_SERVICE_HOST` is set (Kubernetes), OR
- `ECS_CONTAINER_METADATA_URI` is set (AWS ECS)

## Running Locally

### 1. Set up your environment files

Copy the example files:

```bash
cp .env.example .env
cp .env.dev.example .env.dev
```

### 2. Fill in required values

Edit `.env.dev` and provide values for:

- `DATABASE_URL` - PostgreSQL connection string
- API keys (OpenAI, Anthropic, Resend, etc.)
- Any other service-specific configuration

### 3. Start your services

```bash
# Start API
pnpm dev:api

# Start Worker
pnpm dev:worker
```

The services will automatically:

1. Load environment files from the monorepo root
2. Validate all required variables
3. Fail with a clear error if anything is missing

## Production Deployment

### Cloud Run / Kubernetes

1. Set environment variables in your deployment config (do NOT use `.env` files)
2. The application will:
   - Skip file loading
   - Use only injected environment variables
   - Validate configuration on startup
   - Fail fast if anything is misconfigured

### Example Cloud Run deployment.yaml

```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: corely-api
spec:
  template:
    spec:
      containers:
        - image: gcr.io/project/corely-api
          env:
            - name: NODE_ENV
              value: "production"
            - name: DATABASE_URL
              valueFrom:
                secretKeyRef:
                  name: database-credentials
                  key: url
            - name: API_PORT
              value: "8080"
            # ... other env vars
```

## Usage in Code

### Injecting EnvService

```typescript
import { Injectable } from "@nestjs/common";
import { EnvService } from "@corely/config";

@Injectable()
export class MyService {
  constructor(private readonly env: EnvService) {}

  someMethod() {
    const dbUrl = this.env.DATABASE_URL;
    const port = this.env.API_PORT; // number, already parsed
    const isProd = this.env.isProd(); // boolean helper

    // Type-safe access to all config
  }
}
```

### Module Factories

```typescript
@Module({
  providers: [
    {
      provide: MyAdapter,
      useFactory: (env: EnvService) => {
        return new MyAdapter({
          apiKey: env.OPENAI_API_KEY,
          timeout: env.SOME_TIMEOUT,
        });
      },
      inject: [EnvService],
    },
  ],
})
export class MyModule {}
```

## Adding a New Environment Variable

### 1. Update the schema

Edit [`packages/config/src/env/env.schema.ts`](../packages/config/src/env/env.schema.ts):

```typescript
export const envSchema = z.object({
  // ... existing vars

  // Add your new variable
  MY_NEW_VAR: z.string().optional(),
  MY_REQUIRED_VAR: z.string(), // Required var
  MY_NUMBER_VAR: z.coerce.number().int().positive().default(42),
});
```

### 2. Add getter to EnvService

Edit [`packages/config/src/env/env.service.ts`](../packages/config/src/env/env.service.ts):

```typescript
export class EnvService {
  // ... existing getters

  get MY_NEW_VAR(): string | undefined {
    return this.config.MY_NEW_VAR;
  }

  get MY_REQUIRED_VAR(): string {
    return this.config.MY_REQUIRED_VAR;
  }

  get MY_NUMBER_VAR(): number {
    return this.config.MY_NUMBER_VAR;
  }
}
```

### 3. Mark as secret (if sensitive)

If the variable contains secrets (API keys, passwords, etc.), add it to [`packages/config/src/env/env.schema.ts`](../packages/config/src/env/env.schema.ts):

```typescript
export const SECRET_ENV_KEYS: ReadonlySet<keyof Env> = new Set([
  "DATABASE_URL",
  "MY_REQUIRED_VAR", // Add here
  // ... other secrets
]);
```

### 4. Update example files

Add the variable to:

- `.env.example`
- `.env.dev.example`
- `.env.e2e.example` (if needed for e2e tests)

### 5. Rebuild config package

```bash
pnpm --filter @corely/config build
```

### 6. Use in your code

```typescript
constructor(private readonly env: EnvService) {
  const value = this.env.MY_NEW_VAR;
}
```

## Testing

### Unit Tests

Override config in tests:

```typescript
import { Test } from "@nestjs/testing";
import { EnvModule } from "@corely/config";

const module = await Test.createTestingModule({
  imports: [
    EnvModule.forTest({
      DATABASE_URL: "postgresql://test:test@localhost:5432/test",
      MY_VAR: "test-value",
    }),
  ],
  providers: [MyService],
}).compile();

const service = module.get(MyService);
```

### Integration Tests

For real integration tests, use actual `.env.test` or `.env.e2e` files:

```bash
APP_ENV=e2e pnpm test:int
```

## Security Best Practices

### ✅ DO

- Use `EnvService` for all config access
- Store secrets in environment variables (not in code)
- Use `.env.*.local` for local overrides (these are gitignored)
- Validate all required vars with Zod schema
- Mark sensitive vars in `SECRET_ENV_KEYS`
- Use different values for dev/staging/prod

### ❌ DON'T

- Don't use `process.env.X` directly in application code (only allowed in `loadEnv()`)
- Don't commit `.env.local` or `.env.*.local` files
- Don't commit real secrets to `.env.example` files
- Don't log full config objects (use `env.safeSummary()` for debugging)
- Don't skip validation by using `optional()` for actually-required vars

## Debugging

### View safe config summary

```typescript
import { EnvService } from "@corely/config";

@Injectable()
export class DebugService {
  constructor(private readonly env: EnvService) {
    // Logs all config except secrets
    console.log(this.env.safeSummary());
  }
}
```

### Check which files were loaded

Run your service and look for console output:

```
[config] Loading environment files for APP_ENV="dev"
[config] Loading /path/to/.env
[config] Loading /path/to/.env.dev
[config] Environment files loaded successfully
```

### Validation errors

If validation fails, you'll see:

```
Environment validation failed:
  - DATABASE_URL: Required
  - API_PORT: Expected number, received string

Please check your environment variables or .env files.
```

## Architecture

```
packages/config/
├── src/
│   ├── env/
│   │   ├── load-env.ts          # File loading logic
│   │   ├── env.schema.ts        # Zod validation schema
│   │   ├── env.service.ts       # Injectable service
│   │   └── env.module.ts        # NestJS module
│   └── index.ts                 # Public exports
└── package.json

services/api/src/main.ts          # Calls loadEnv() on startup
services/api/src/app.module.ts    # Imports EnvModule.forRoot()
services/worker/src/main.ts       # Calls loadEnv() on startup
services/worker/src/worker.module.ts  # Imports EnvModule.forRoot()
```

## FAQ

### Q: Can I use different .env files for different services?

**A:** No. All services share the same `.env` files at the monorepo root. This ensures consistency across the stack.

### Q: How do I use different configs in dev vs prod?

**A:** Use different `.env` files:

- Local dev: `.env.dev`
- Staging: set `APP_ENV=staging` and create `.env.staging`
- Production: inject environment variables directly (no files)

### Q: What if I need service-specific config?

**A:** Add the variables to the shared schema, and each service can choose to use them or not. Unused vars are harmless.

### Q: Can the frontend use EnvService?

**A:** No. `EnvService` is for backend (NestJS) only. The frontend uses Vite's `import.meta.env` with `VITE_` prefixed variables.

### Q: How do I rotate secrets?

**A:** Update the environment variable in your deployment platform (Cloud Run, K8s, etc.). The next deployment will pick up the new value. Never commit secrets to version control.

---

For more help, see:

- [packages/config/src/index.ts](../packages/config/src/index.ts) - Public API
- [packages/config/src/env/env.schema.ts](../packages/config/src/env/env.schema.ts) - All available vars
- [.env.example](../.env.example) - Example configuration
