import { Injectable } from "@nestjs/common";
import { type Env, SECRET_ENV_KEYS } from "./env.schema";

/**
 * Injectable service providing typed access to environment configuration.
 * Use this instead of direct process.env access throughout the application.
 */
@Injectable()
export class EnvService {
  constructor(private readonly config: Env) {}

  // ============================================================================
  // COMMON SETTINGS
  // ============================================================================

  get NODE_ENV(): "development" | "test" | "production" {
    return this.config.NODE_ENV;
  }

  get APP_ENV(): string {
    return this.config.APP_ENV;
  }

  get LOG_LEVEL(): "error" | "warn" | "info" | "debug" | "verbose" {
    return this.config.LOG_LEVEL;
  }

  // ============================================================================
  // DATABASE
  // ============================================================================

  get DATABASE_URL(): string {
    return this.config.DATABASE_URL;
  }

  get REDIS_URL(): string | undefined {
    return this.config.REDIS_URL;
  }

  get WORKFLOW_QUEUE_DRIVER(): "bullmq" | "memory" | "cloudtasks" | undefined {
    return this.config.WORKFLOW_QUEUE_DRIVER;
  }

  get WORKFLOW_CLOUDTASKS_LOCATION(): string | undefined {
    return this.config.WORKFLOW_CLOUDTASKS_LOCATION;
  }

  get WORKFLOW_CLOUDTASKS_QUEUE_PREFIX(): string | undefined {
    return this.config.WORKFLOW_CLOUDTASKS_QUEUE_PREFIX;
  }

  get WORKFLOW_CLOUDTASKS_TARGET_BASE_URL(): string | undefined {
    return this.config.WORKFLOW_CLOUDTASKS_TARGET_BASE_URL;
  }

  get WORKFLOW_CLOUDTASKS_SERVICE_ACCOUNT(): string | undefined {
    return this.config.WORKFLOW_CLOUDTASKS_SERVICE_ACCOUNT;
  }

  get WORKFLOW_QUEUE_SECRET(): string | undefined {
    return this.config.WORKFLOW_QUEUE_SECRET;
  }

  // ============================================================================
  // PORTS
  // ============================================================================

  get API_PORT(): number {
    return this.config.API_PORT;
  }

  get WEB_PORT(): number {
    return this.config.WEB_PORT;
  }

  get MOCK_PORT(): number {
    return this.config.MOCK_PORT;
  }

  get WORKER_PORT(): number {
    return this.config.WORKER_PORT;
  }

  // ============================================================================
  // AI PROVIDERS
  // ============================================================================

  get AI_MODEL_PROVIDER(): "openai" | "anthropic" {
    return this.config.AI_MODEL_PROVIDER;
  }

  get AI_MODEL_ID(): string {
    return this.config.AI_MODEL_ID;
  }

  get OPENAI_API_KEY(): string | undefined {
    return this.config.OPENAI_API_KEY;
  }

  get ANTHROPIC_API_KEY(): string | undefined {
    return this.config.ANTHROPIC_API_KEY;
  }

  // ============================================================================
  // EMAIL PROVIDERS
  // ============================================================================

  get EMAIL_PROVIDER(): "resend" | "sendgrid" | "ses" | "postmark" {
    return this.config.EMAIL_PROVIDER;
  }

  get RESEND_API_KEY(): string | undefined {
    return this.config.RESEND_API_KEY;
  }

  get RESEND_FROM(): string | undefined {
    return this.config.RESEND_FROM;
  }

  get RESEND_REPLY_TO(): string | undefined {
    return this.config.RESEND_REPLY_TO;
  }

  get RESEND_WEBHOOK_SECRET(): string | undefined {
    return this.config.RESEND_WEBHOOK_SECRET;
  }

  // ============================================================================
  // OBJECT STORAGE
  // ============================================================================

  get STORAGE_PROVIDER(): "gcs" | "s3" | "local" {
    return this.config.STORAGE_PROVIDER;
  }

  get STORAGE_BUCKET(): string {
    return this.config.STORAGE_BUCKET;
  }

  get STORAGE_KEY_PREFIX(): string | undefined {
    return this.config.STORAGE_KEY_PREFIX;
  }

  get SIGNED_URL_UPLOAD_TTL_SECONDS(): number {
    return this.config.SIGNED_URL_UPLOAD_TTL_SECONDS;
  }

  get SIGNED_URL_DOWNLOAD_TTL_SECONDS(): number {
    return this.config.SIGNED_URL_DOWNLOAD_TTL_SECONDS;
  }

  get MAX_UPLOAD_BYTES(): number | undefined {
    return this.config.MAX_UPLOAD_BYTES;
  }

  get GOOGLE_CLOUD_PROJECT(): string | undefined {
    return this.config.GOOGLE_CLOUD_PROJECT;
  }

  get GOOGLE_APPLICATION_CREDENTIALS(): string | undefined {
    return this.config.GOOGLE_APPLICATION_CREDENTIALS;
  }

  // ============================================================================
  // OBSERVABILITY
  // ============================================================================

  get OBSERVABILITY_PROVIDER(): "none" | "otel" | "langfuse" {
    return this.config.OBSERVABILITY_PROVIDER;
  }

  get OBSERVABILITY_SAMPLE_RATIO(): number {
    return this.config.OBSERVABILITY_SAMPLE_RATIO;
  }

  get OBSERVABILITY_MASKING_MODE(): "off" | "standard" | "strict" {
    return this.config.OBSERVABILITY_MASKING_MODE;
  }

  get OTEL_EXPORTER_OTLP_ENDPOINT(): string | undefined {
    return this.config.OTEL_EXPORTER_OTLP_ENDPOINT;
  }

  get OTEL_EXPORTER_OTLP_HEADERS(): string | undefined {
    return this.config.OTEL_EXPORTER_OTLP_HEADERS;
  }

  get LANGFUSE_BASE_URL(): string | undefined {
    return this.config.LANGFUSE_BASE_URL;
  }

  get LANGFUSE_PUBLIC_KEY(): string | undefined {
    return this.config.LANGFUSE_PUBLIC_KEY;
  }

  get LANGFUSE_SECRET_KEY(): string | undefined {
    return this.config.LANGFUSE_SECRET_KEY;
  }

  // ============================================================================
  // SECURITY & AUTH
  // ============================================================================

  get JWT_SECRET(): string | undefined {
    return this.config.JWT_SECRET;
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Returns true if running in production mode.
   */
  isProd(): boolean {
    return this.config.NODE_ENV === "production";
  }

  /**
   * Returns true if running in development mode.
   */
  isDev(): boolean {
    return this.config.NODE_ENV === "development";
  }

  /**
   * Returns true if running in test mode.
   */
  isTest(): boolean {
    return this.config.NODE_ENV === "test";
  }

  /**
   * Returns a safe summary of configuration for debugging.
   * Excludes sensitive values (secrets, API keys, connection strings).
   */
  safeSummary(): Record<string, string | number | boolean> {
    const summary: Record<string, string | number | boolean> = {};

    for (const [key, value] of Object.entries(this.config)) {
      if (SECRET_ENV_KEYS.has(key as keyof Env)) {
        summary[key] = "[REDACTED]";
      } else if (value !== undefined && value !== null) {
        summary[key] = value;
      }
    }

    return summary;
  }

  /**
   * Returns the full config object (for internal use only).
   * WARNING: Contains secrets - do not log or expose this!
   */
  getConfig(): Readonly<Env> {
    return this.config;
  }
}
