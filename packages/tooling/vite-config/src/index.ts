import type { UserConfig } from "vite";
import type { UserConfig as VitestConfig } from "vitest/config";

export interface BaseViteConfigOptions {
  /**
   * Port for dev server (default: 8080)
   */
  port?: number;

  /**
   * Path aliases for module resolution
   */
  aliases?: Record<string, string>;

  /**
   * Additional plugins to include
   */
  plugins?: any[];

  /**
   * Workspace packages to exclude from optimization
   */
  excludeFromOptimizeDeps?: string[];

  /**
   * Watch workspace packages for changes
   */
  watchWorkspacePackages?: string[];
}

export interface BaseVitestConfigOptions {
  /**
   * Include patterns for test files
   */
  include?: string[];

  /**
   * Exclude patterns for test files
   */
  exclude?: string[];

  /**
   * Global test setup files
   */
  setupFiles?: string[];

  /**
   * Enable coverage
   */
  coverage?: boolean;
}

/**
 * Create a base Vite configuration with sensible defaults
 */
export function createBaseViteConfig(options: BaseViteConfigOptions = {}): UserConfig {
  const {
    port = 8080,
    aliases = {},
    plugins = [],
    excludeFromOptimizeDeps = [],
    watchWorkspacePackages = [],
  } = options;

  return {
    plugins,
    server: {
      host: "::",
      port,
      ...(watchWorkspacePackages.length > 0 && {
        watch: {
          // Watch workspace packages for changes
          ignored: [`!**/node_modules/{${watchWorkspacePackages.join(",")}}/**`],
        },
      }),
    },
    optimizeDeps: {
      // Exclude workspace packages from pre-bundling so changes are picked up
      exclude: excludeFromOptimizeDeps,
    },
    resolve: {
      alias: aliases,
    },
  };
}

/**
 * Create a base Vitest configuration with sensible defaults
 */
export function createBaseVitestConfig(options: BaseVitestConfigOptions = {}): VitestConfig {
  const {
    include = ["**/*.{test,spec}.{js,ts,jsx,tsx}"],
    exclude = ["**/node_modules/**", "**/dist/**", "**/build/**"],
    setupFiles = [],
    coverage = false,
  } = options;

  return {
    test: {
      include,
      exclude,
      setupFiles,
      globals: true,
      environment: "node",
      ...(coverage && {
        coverage: {
          provider: "v8",
          reporter: ["text", "json", "html"],
          exclude: [
            "**/*.config.*",
            "**/*.d.ts",
            "**/dist/**",
            "**/node_modules/**",
            "**/__tests__/**",
            "**/*.test.*",
            "**/*.spec.*",
          ],
        },
      }),
    },
  };
}

/**
 * Merge Vite config with Vitest config
 */
export function mergeViteAndVitest(viteConfig: UserConfig, vitestConfig: VitestConfig): UserConfig {
  return vitestConfig.test
    ? {
        ...viteConfig,
        test: vitestConfig.test,
      }
    : viteConfig;
}
