import { Module, DynamicModule, Global } from "@nestjs/common";
import { EnvService } from "./env.service";
import { loadEnv } from "./load-env";
import { validateEnv, type Env } from "./env.schema";

export interface EnvModuleOptions {
  /**
   * Override env values for testing purposes.
   * These will be merged with process.env before validation.
   */
  overrides?: Partial<Env>;

  /**
   * Skip automatic env file loading.
   * Useful if you've already loaded env files in your bootstrap.
   * Default: false
   */
  skipLoad?: boolean;
}

/**
 * Global module providing EnvService for typed environment configuration.
 *
 * Usage in your app:
 *
 * @Module({
 *   imports: [EnvModule.forRoot()],
 * })
 * export class AppModule {}
 *
 * Then inject EnvService anywhere:
 *
 * constructor(private readonly env: EnvService) {}
 */
@Global()
@Module({})
export class EnvModule {
  /**
   * Register the EnvModule and configure environment loading.
   *
   * @param options - Configuration options
   * @returns A configured dynamic module
   */
  static forRoot(options: EnvModuleOptions = {}): DynamicModule {
    // Load env files (unless skipped or in production)
    if (!options.skipLoad) {
      loadEnv();
    }

    // Merge overrides with process.env for validation
    const envToValidate = options.overrides
      ? {
          ...process.env,
          // Normalize overrides to strings so they satisfy ProcessEnv typing
          ...Object.entries(options.overrides).reduce<Record<string, string>>(
            (acc, [key, value]) => {
              if (value === undefined) {
                return acc;
              }
              acc[key] = String(value);
              return acc;
            },
            {}
          ),
        }
      : process.env;

    // Validate and parse environment
    const config = validateEnv(envToValidate);

    return {
      global: true,
      module: EnvModule,
      providers: [
        {
          provide: EnvService,
          useValue: new EnvService(config),
        },
      ],
      exports: [EnvService],
    };
  }

  /**
   * Helper for tests: create an EnvModule with test overrides.
   *
   * Example:
   * const module = await Test.createTestingModule({
   *   imports: [EnvModule.forTest({ DATABASE_URL: 'postgresql://test' })],
   * }).compile();
   */
  static forTest(overrides: Partial<Env> = {}): DynamicModule {
    return EnvModule.forRoot({
      skipLoad: true,
      overrides: {
        // Provide safe defaults for test environment
        NODE_ENV: "test",
        DATABASE_URL: "postgresql://test:test@localhost:5432/test",
        ...overrides,
      },
    });
  }
}
