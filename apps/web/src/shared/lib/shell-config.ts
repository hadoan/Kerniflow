/**
 * Shell Config Hooks - Re-exported for module use
 *
 * Modules should import these hooks from @/shared/lib/shell-config
 * to access server-driven UI configuration.
 *
 * DO NOT import directly from app/providers - use this barrel export.
 */

export {
  useShellConfig,
  useCapabilities,
  useTerminology,
  useIsModuleEnabled,
} from "@/app/providers/shell-config-provider";

export type { ShellConfig, Capabilities, Terminology } from "@corely/contracts";
