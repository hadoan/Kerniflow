import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { config } from "dotenv";

/**
 * Determines if we're running in a production-like environment.
 * Production environments should NOT load .env files - they use injected process.env.
 */
function isProductionEnvironment(): boolean {
  // Always allow .env loading in development and test environments
  const nodeEnv = process.env.NODE_ENV;
  if (nodeEnv === "development" || nodeEnv === "test") {
    return false;
  }

  // Check if NODE_ENV is production
  if (nodeEnv === "production") {
    return true;
  }

  // Check for Cloud Run / GCP marker
  if (process.env.K_SERVICE) {
    return true;
  }

  // Check for other common container/cloud markers
  if (process.env.KUBERNETES_SERVICE_HOST || process.env.ECS_CONTAINER_METADATA_URI) {
    return true;
  }

  // Check if running in Docker (common marker)
  if (process.env.DOCKER_CONTAINER || process.env.HOSTNAME?.includes("docker")) {
    return true;
  }

  return false;
}

/**
 * Find monorepo root by looking for package.json with workspaces
 */
function findMonorepoRoot(): string {
  let currentDir = process.cwd();

  // Search up to 5 levels
  for (let i = 0; i < 5; i++) {
    const packageJsonPath = resolve(currentDir, "package.json");
    if (existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
        if (packageJson.workspaces || packageJson.name === "corely") {
          return currentDir;
        }
      } catch {
        // Continue searching
      }
    }

    const parentDir = resolve(currentDir, "..");
    if (parentDir === currentDir) {
      break;
    } // Reached filesystem root
    currentDir = parentDir;
  }

  // Fallback: use cwd
  return process.cwd();
}

/**
 * Loads environment variables from .env files in the correct precedence order.
 * Only loads files in local/dev/test environments - production uses process.env directly.
 *
 * Precedence (highest to lowest):
 * 1. Actual process.env variables (always win)
 * 2. .env.<APP_ENV>.local
 * 3. .env.<APP_ENV>
 * 4. .env.local
 * 5. .env
 *
 * @param options.rootDir - The root directory to load .env files from (defaults to monorepo root)
 */
export function loadEnv(options?: { rootDir?: string }): void {
  // In production, skip file loading entirely
  if (isProductionEnvironment()) {
    console.log("[config] Production environment detected - skipping .env file loading");
    return;
  }

  // Determine root directory (monorepo root by default)
  const rootDir = options?.rootDir ?? findMonorepoRoot();

  // Determine APP_ENV (fallback: NODE_ENV, then 'dev')
  const appEnv = process.env.APP_ENV ?? process.env.NODE_ENV ?? "dev";

  // List of env files to try loading (in reverse precedence order)
  // We load in reverse order because dotenv doesn't override existing vars
  const envFiles = [
    resolve(rootDir, ".env"),
    resolve(rootDir, ".env.local"),
    resolve(rootDir, `.env.${appEnv}`),
    resolve(rootDir, `.env.${appEnv}.local`),
  ];

  console.log(`[config] Loading environment files for APP_ENV="${appEnv}"`);

  // Load files in reverse order so higher precedence files override lower ones
  for (const filePath of envFiles) {
    if (existsSync(filePath)) {
      console.log(`[config] Loading ${filePath}`);
      config({ path: filePath, override: false });
    }
  }

  console.log("[config] Environment files loaded successfully");
}
