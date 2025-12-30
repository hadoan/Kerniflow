#!/usr/bin/env tsx
/**
 * Catalog Sync Script
 * Syncs app manifests, template definitions, and pack definitions from code to database
 * Run this after migrations to update the catalog tables
 *
 * Usage: pnpm catalog:sync
 */

import { PrismaClient } from "@kerniflow/data";
import { AppRegistry } from "../modules/platform/infrastructure/registries/app-registry";

async function syncCatalog() {
  const prisma = new PrismaClient();
  const appRegistry = new AppRegistry();

  try {
    // eslint-disable-next-line no-console
    console.log("🔄 Starting catalog sync...\n");

    // Load manifests
    appRegistry.loadManifests();

    // Sync apps
    // eslint-disable-next-line no-console
    console.log("📦 Syncing app catalog...");
    const apps = appRegistry.list();
    let appsCreated = 0;
    let appsUpdated = 0;

    for (const manifest of apps) {
      const existing = await prisma.appCatalog.findUnique({
        where: { appId: manifest.appId },
      });

      await prisma.appCatalog.upsert({
        where: { appId: manifest.appId },
        create: {
          appId: manifest.appId,
          name: manifest.name,
          tier: manifest.tier,
          version: manifest.version,
          description: manifest.description ?? null,
          depsJson: JSON.stringify(manifest.dependencies),
          permissionsJson: JSON.stringify(manifest.permissions),
          capabilitiesJson: JSON.stringify(manifest.capabilities),
          menuJson: JSON.stringify(manifest.menu),
          settingsSchemaJson: manifest.settingsSchema
            ? JSON.stringify(manifest.settingsSchema)
            : null,
        },
        update: {
          name: manifest.name,
          tier: manifest.tier,
          version: manifest.version,
          description: manifest.description ?? null,
          depsJson: JSON.stringify(manifest.dependencies),
          permissionsJson: JSON.stringify(manifest.permissions),
          capabilitiesJson: JSON.stringify(manifest.capabilities),
          menuJson: JSON.stringify(manifest.menu),
          settingsSchemaJson: manifest.settingsSchema
            ? JSON.stringify(manifest.settingsSchema)
            : null,
        },
      });

      if (existing) {
        appsUpdated++;
      } else {
        appsCreated++;
      }
    }

    // eslint-disable-next-line no-console
    console.log(`   ✅ ${appsCreated} apps created, ${appsUpdated} apps updated`);

    // TODO: Sync templates when template registry is implemented
    // eslint-disable-next-line no-console
    console.log("\n📄 Template sync: skipped (not yet implemented)");

    // TODO: Sync packs when pack registry is implemented
    // eslint-disable-next-line no-console
    console.log("📦 Pack sync: skipped (not yet implemented)");

    // eslint-disable-next-line no-console
    console.log("\n✨ Catalog sync completed successfully!");
  } catch (error) {
    console.error("\n❌ Catalog sync failed:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run if executed directly
if (require.main === module) {
  void syncCatalog();
}

export { syncCatalog };
