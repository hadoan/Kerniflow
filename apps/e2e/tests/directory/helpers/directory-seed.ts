import { execFileSync } from "node:child_process";
import { buildDirectoryRestaurantFixtures } from "../fixtures/restaurants.fixture.ts";
import {
  DIRECTORY_SCOPE,
  cleanupDirectoryFixturesByPrefix,
  seedDirectoryRestaurants,
} from "./db.ts";
import { getRepoRoot, loadDirectoryE2eEnv } from "./env.ts";

loadDirectoryE2eEnv();

export function createRunTag(label: string): string {
  const normalized = label
    .replace(/[^a-z0-9]/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 30);

  const randomPart = Math.random().toString(36).slice(2, 8);
  return `e2e-dir-${normalized}-${Date.now()}-${randomPart}`;
}

export async function seedDirectoryFixtureSet(runTag: string): Promise<{
  prefix: string;
  activeSlug: string;
  hiddenSlug: string;
}> {
  const fixtures = buildDirectoryRestaurantFixtures(runTag);
  const prefix = `${runTag}-`;

  await cleanupDirectoryFixturesByPrefix(prefix);
  await seedDirectoryRestaurants([fixtures.activePho, fixtures.activeBunCha, fixtures.hiddenPho]);

  return {
    prefix,
    activeSlug: fixtures.activePho.slug,
    hiddenSlug: fixtures.hiddenPho.slug,
  };
}

export async function cleanupDirectoryFixtureSet(prefix: string): Promise<void> {
  await cleanupDirectoryFixturesByPrefix(prefix);
}

export function runDirectoryImportSeedCli(args: { slugPrefix: string; namePrefix: string }): void {
  execFileSync(
    "pnpm",
    [
      "seed:directory",
      "--yes",
      "--tenant-id",
      DIRECTORY_SCOPE.tenantId,
      "--workspace-id",
      DIRECTORY_SCOPE.workspaceId,
      "--slug-prefix",
      args.slugPrefix,
      "--name-prefix",
      args.namePrefix,
    ],
    {
      cwd: getRepoRoot(),
      stdio: "inherit",
      env: process.env,
    }
  );
}
