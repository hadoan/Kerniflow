# @corely/config

Runtime configuration utilities for Corely monorepo. This package provides type-safe environment variable management and configuration services for backend services.

> **Note**: This is a **runtime-only** package. For development tooling configs (TypeScript, ESLint, Prettier, Vite), see `packages/tooling/*`.

## Installation

```bash
pnpm add @corely/config@workspace:*
```

## Usage

### NestJS Services (API, Worker)

```typescript
// main.ts or app.module.ts
import { EnvModule } from "@corely/config";

@Module({
  imports: [
    EnvModule.forRoot({
      isGlobal: true,
    }),
    // other modules...
  ],
})
export class AppModule {}
```

### Using EnvService

```typescript
import { EnvService } from "@corely/config";

@Injectable()
export class SomeService {
  constructor(private readonly envService: EnvService) {}

  doSomething() {
    const dbUrl = this.envService.get("DATABASE_URL");
    const isDev = this.envService.isDevelopment();
    // All environment variables are type-safe and validated
  }
}
```

### Standalone Usage

```typescript
import { loadEnv, validateEnv } from "@corely/config";

// Load and validate environment variables
const env = loadEnv();
const validatedEnv = validateEnv(env);

console.log(validatedEnv.DATABASE_URL);
console.log(validatedEnv.NODE_ENV);
```

## Environment Variable Loading

The package loads environment variables from multiple sources in this order:

1. **Local development** (.env files):
   - `.env.local` (highest priority, git-ignored)
   - `.env.{NODE_ENV}` (e.g., `.env.development`, `.env.test`)
   - `.env` (default)

2. **Cloud deployment** (Google Cloud Run):
   - `process.env` (environment variables set in Cloud Run configuration)
   - No .env files needed in production

## Configuration

### Environment Schema

Environment variables are validated using Zod. See `src/env/env.schema.ts` for the full schema.

Key variables include:

- `NODE_ENV`: Environment name (development, production, test)
- `PORT`: Server port
- `DATABASE_URL`: PostgreSQL connection string
- `JWT_SECRET`: JWT signing secret
- And more...

### Secret Management

Sensitive keys (defined in `SECRET_ENV_KEYS`) are automatically masked in logs.

## API Reference

### `EnvModule`

NestJS module for dependency injection.

```typescript
EnvModule.forRoot({
  isGlobal?: boolean;  // Make module available globally
})
```

### `EnvService`

Injectable service for accessing environment variables.

```typescript
class EnvService {
  get<K extends keyof Env>(key: K): Env[K];
  isDevelopment(): boolean;
  isProduction(): boolean;
  isTest(): boolean;
}
```

### `loadEnv()`

Loads environment variables from .env files and process.env.

```typescript
function loadEnv(): Record<string, string | undefined>;
```

### `validateEnv(env)`

Validates environment variables against the schema.

```typescript
function validateEnv(env: Record<string, unknown>): Env;
```

## Local vs. Cloud Run

### Local Development

1. Create `.env` file in repo root:

```bash
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret
```

2. Start services:

```bash
pnpm dev:api
pnpm dev:worker
```

Environment variables are automatically loaded from .env files.

### Google Cloud Run

1. Set environment variables in Cloud Run service configuration:

```bash
gcloud run services update api \
  --set-env-vars="NODE_ENV=production,DATABASE_URL=..." \
  --region=...
```

2. No .env files in container - all config comes from `process.env`

## Best Practices

1. **Never commit secrets**: Use `.env.local` for local secrets (git-ignored)
2. **Type safety**: Always use `EnvService` for type-safe access
3. **Validation**: Environment is validated at startup - app won't start with invalid config
4. **Secret masking**: Sensitive values are automatically masked in logs
5. **Cloud deployment**: Use Cloud Run environment variables, not .env files

## Separation of Concerns

This package is **runtime-only** and should never depend on:

- ESLint, Prettier, or other linters
- Vite, Vitest, or build tools
- TypeScript configuration packages

For development tooling, use packages under `packages/tooling/*`.

## License

Private package for Corely monorepo.
