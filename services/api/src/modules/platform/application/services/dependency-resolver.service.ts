import { Injectable } from "@nestjs/common";
import { ValidationError } from "@corely/kernel";
import type { AppRegistryPort } from "../ports/app-registry.port";

/**
 * Dependency Resolver Service
 * Resolves app dependencies with topological sorting and cycle detection
 */
@Injectable()
export class DependencyResolverService {
  /**
   * Resolve dependencies for an app (includes transitive dependencies)
   * Returns list in dependency order (dependencies before dependents)
   */
  resolve(appId: string, registry: AppRegistryPort): string[] {
    const resolved: string[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (id: string) => {
      if (resolved.includes(id)) {
        return; // Already resolved
      }

      if (visiting.has(id)) {
        // Cycle detected
        throw new ValidationError(`Circular dependency detected involving app: ${id}`, {
          code: "Platform:CircularDependency",
        });
      }

      visited.add(id);
      visiting.add(id);

      const manifest = registry.get(id);
      if (!manifest) {
        throw new ValidationError(`App not found: ${id}`, {
          code: "Platform:AppNotFound",
        });
      }

      // Visit dependencies first
      for (const depId of manifest.dependencies) {
        visit(depId);
      }

      visiting.delete(id);

      // Add to resolved list if not already there
      if (!resolved.includes(id)) {
        resolved.push(id);
      }
    };

    visit(appId);

    // Remove the app itself from the list (only return dependencies)
    return resolved.filter((id) => id !== appId);
  }

  /**
   * Check if there are any circular dependencies in a set of apps
   */
  hasCycle(appIds: string[], registry: AppRegistryPort): boolean {
    try {
      for (const appId of appIds) {
        this.resolve(appId, registry);
      }
      return false;
    } catch (error) {
      if (error instanceof ValidationError && error.code === "Platform:CircularDependency") {
        return true;
      }
      throw error;
    }
  }

  /**
   * Get all apps that depend on a given app
   */
  findDependents(appId: string, enabledApps: string[], registry: AppRegistryPort): string[] {
    const dependents: string[] = [];

    for (const enabledAppId of enabledApps) {
      if (enabledAppId === appId) {
        continue;
      }

      const manifest = registry.get(enabledAppId);
      if (manifest && manifest.dependencies.includes(appId)) {
        dependents.push(enabledAppId);
      }
    }

    return dependents;
  }
}
