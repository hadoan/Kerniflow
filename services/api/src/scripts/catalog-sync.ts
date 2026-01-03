#!/usr/bin/env tsx
/**
 * Catalog Sync Script
 * Syncs app manifests, template definitions, and pack definitions from code to database
 * Run this after migrations to update the catalog tables
 *
 * Usage: pnpm catalog:sync
 */

import { PrismaService } from "@corely/data";
import { AppRegistry } from "../modules/platform/infrastructure/registries/app-registry";
import { TemplateRegistry } from "../modules/platform/infrastructure/registries/template-registry";
import { PackRegistry } from "../modules/platform/infrastructure/registries/pack-registry";

async function syncCatalog() {
  const prisma = new PrismaService();
  const appRegistry = new AppRegistry();
  const templateRegistry = new TemplateRegistry();
  const packRegistry = new PackRegistry();

  try {
    // eslint-disable-next-line no-console
    console.log("🔄 Starting catalog sync...\n");

    // Load manifests
    appRegistry.loadManifests();
    templateRegistry.loadTemplates();
    packRegistry.loadPacks();

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

    // Sync templates
    // eslint-disable-next-line no-console
    console.log("\n📄 Syncing template catalog...");
    const templates = templateRegistry.list();
    let templatesCreated = 0;
    let templatesUpdated = 0;

    for (const template of templates) {
      const existing = await prisma.templateCatalog.findUnique({
        where: { templateId: template.templateId },
      });

      await prisma.templateCatalog.upsert({
        where: { templateId: template.templateId },
        create: {
          templateId: template.templateId,
          name: template.name,
          category: template.category,
          version: template.version,
          description: template.description ?? null,
          requiresAppsJson: JSON.stringify(template.requiresApps),
          paramsSchemaJson: JSON.stringify(template.paramsSchema),
          upgradePolicyJson: JSON.stringify(template.upgradePolicy),
        },
        update: {
          name: template.name,
          category: template.category,
          version: template.version,
          description: template.description ?? null,
          requiresAppsJson: JSON.stringify(template.requiresApps),
          paramsSchemaJson: JSON.stringify(template.paramsSchema),
          upgradePolicyJson: JSON.stringify(template.upgradePolicy),
        },
      });

      if (existing) {
        templatesUpdated++;
      } else {
        templatesCreated++;
      }
    }

    // eslint-disable-next-line no-console
    console.log(
      `   ✅ ${templatesCreated} templates created, ${templatesUpdated} templates updated`
    );

    // Sync packs
    // eslint-disable-next-line no-console
    console.log("\n📦 Syncing pack catalog...");
    const packs = packRegistry.list();
    let packsCreated = 0;
    let packsUpdated = 0;

    for (const pack of packs) {
      const existing = await prisma.packCatalog.findUnique({
        where: { packId: pack.packId },
      });

      await prisma.packCatalog.upsert({
        where: { packId: pack.packId },
        create: {
          packId: pack.packId,
          name: pack.name,
          version: pack.version,
          description: pack.description ?? null,
          definitionJson: JSON.stringify(pack),
        },
        update: {
          name: pack.name,
          version: pack.version,
          description: pack.description ?? null,
          definitionJson: JSON.stringify(pack),
        },
      });

      if (existing) {
        packsUpdated++;
      } else {
        packsCreated++;
      }
    }

    // eslint-disable-next-line no-console
    console.log(`   ✅ ${packsCreated} packs created, ${packsUpdated} packs updated`);

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
