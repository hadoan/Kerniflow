import { z } from "zod";

/**
 * Zod schema for environment variables.
 * Validates and coerces types for all required and optional env vars.
 */
export const envSchema = z.object({
  // ============================================================================
  // COMMON SETTINGS
  // ============================================================================
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_ENV: z.string().default("dev"),
  LOG_LEVEL: z.enum(["error", "warn", "info", "debug", "verbose"]).default("info"),

  // ============================================================================
  // POSTGRES DATABASE
  // ============================================================================
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid PostgreSQL connection string"),

  // ============================================================================
  // REDIS CACHE & QUEUE
  // ============================================================================
  REDIS_URL: z.string().url("REDIS_URL must be a valid Redis connection string"),

  // ============================================================================
  // PORTS
  // ============================================================================
  API_PORT: z.coerce.number().int().positive().default(3000),
  WEB_PORT: z.coerce.number().int().positive().default(5173),
  MOCK_PORT: z.coerce.number().int().positive().default(4000),

  // ============================================================================
  // AI PROVIDERS
  // ============================================================================
  AI_MODEL_PROVIDER: z.enum(["openai", "anthropic"]).default("openai"),
  AI_MODEL_ID: z.string().default("gpt-4o-mini"),
  OPENAI_API_KEY: z.string().optional(),
  ANTHROPIC_API_KEY: z.string().optional(),

  // ============================================================================
  // EMAIL PROVIDERS
  // ============================================================================
  EMAIL_PROVIDER: z.enum(["resend", "sendgrid", "ses", "postmark"]).default("resend"),
  RESEND_API_KEY: z.string().optional(),
  RESEND_FROM: z.string().optional(),
  RESEND_REPLY_TO: z.string().optional(),
  RESEND_WEBHOOK_SECRET: z.string().optional(),

  // ============================================================================
  // OBJECT STORAGE (GCS)
  // ============================================================================
  STORAGE_PROVIDER: z.enum(["gcs", "s3", "local"]).default("gcs"),
  STORAGE_BUCKET: z.string().default("uploads"),
  STORAGE_KEY_PREFIX: z.string().optional(),
  SIGNED_URL_UPLOAD_TTL_SECONDS: z.coerce.number().int().positive().default(600),
  SIGNED_URL_DOWNLOAD_TTL_SECONDS: z.coerce.number().int().positive().default(600),
  MAX_UPLOAD_BYTES: z.coerce.number().int().positive().optional(),

  // Google Cloud
  GOOGLE_CLOUD_PROJECT: z.string().optional(),
  GOOGLE_APPLICATION_CREDENTIALS: z.string().optional(),

  // ============================================================================
  // OBSERVABILITY
  // ============================================================================
  OBSERVABILITY_PROVIDER: z.enum(["none", "otel", "langfuse"]).default("none"),
  OBSERVABILITY_SAMPLE_RATIO: z.coerce.number().min(0).max(1).default(1),
  OBSERVABILITY_MASKING_MODE: z.enum(["off", "standard", "strict"]).default("standard"),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
  OTEL_EXPORTER_OTLP_HEADERS: z.string().optional(),
  LANGFUSE_BASE_URL: z.string().url().optional(),
  LANGFUSE_PUBLIC_KEY: z.string().optional(),
  LANGFUSE_SECRET_KEY: z.string().optional(),

  // ============================================================================
  // SECURITY & AUTH
  // ============================================================================
  JWT_SECRET: z.string().optional(),

  // ============================================================================
  // CLOUD RUN / K8S MARKERS (for detection only, not user-configurable)
  // ============================================================================
  K_SERVICE: z.string().optional(),
  KUBERNETES_SERVICE_HOST: z.string().optional(),
  ECS_CONTAINER_METADATA_URI: z.string().optional(),
});

/**
 * Type representing the validated environment configuration.
 */
export type Env = z.infer<typeof envSchema>;

/**
 * List of environment variable keys that should be treated as secrets
 * and excluded from logs or debug output.
 */
export const SECRET_ENV_KEYS: ReadonlySet<keyof Env> = new Set([
  "DATABASE_URL",
  "REDIS_URL",
  "OPENAI_API_KEY",
  "ANTHROPIC_API_KEY",
  "RESEND_API_KEY",
  "RESEND_WEBHOOK_SECRET",
  "JWT_SECRET",
  "GOOGLE_APPLICATION_CREDENTIALS",
  "LANGFUSE_SECRET_KEY",
  "OTEL_EXPORTER_OTLP_HEADERS",
]);

/**
 * Validates process.env against the schema and returns a typed Env object.
 * Throws a detailed error if validation fails.
 */
export function validateEnv(env: NodeJS.ProcessEnv = process.env): Env {
  try {
    return envSchema.parse(env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missingOrInvalid = error.errors.map((err) => {
        const path = err.path.join(".");
        const message = err.message;
        return `  - ${path}: ${message}`;
      });

      throw new Error(
        `Environment validation failed:\n${missingOrInvalid.join("\n")}\n\n` +
          `Please check your environment variables or .env files.`
      );
    }
    throw error;
  }
}
