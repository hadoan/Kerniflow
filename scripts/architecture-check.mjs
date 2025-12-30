import fs from "node:fs";
import path from "node:path";

const repoRoot = path.resolve(new URL(".", import.meta.url).pathname, "..");

const webSrc = path.join(repoRoot, "apps", "web", "src");
const apiModules = path.join(repoRoot, "services", "api", "src", "modules");
const packagesDir = path.join(repoRoot, "packages");

const violations = [];

function addViolation(message, filePath) {
  const rel = path.relative(repoRoot, filePath);
  violations.push(`${rel}: ${message}`);
}

function listFiles(dir, exts) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === "dist" || entry.name === "build") {
      continue;
    }
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...listFiles(fullPath, exts));
      continue;
    }
    if (exts.some((ext) => entry.name.endsWith(ext))) {
      results.push(fullPath);
    }
  }
  return results;
}

function extractImports(source) {
  const imports = [];
  const importRegex = /from\\s+['\"]([^'\"]+)['\"]/g;
  const requireRegex = /require\\(['\"]([^'\"]+)['\"]\\)/g;
  let match;
  while ((match = importRegex.exec(source))) {
    imports.push(match[1]);
  }
  while ((match = requireRegex.exec(source))) {
    imports.push(match[1]);
  }
  return imports;
}

function moduleNameFromPath(filePath, baseDir) {
  const rel = path.relative(baseDir, filePath);
  const parts = rel.split(path.sep);
  return parts[0] || null;
}

function checkFrontendBoundaries() {
  const files = listFiles(webSrc, [".ts", ".tsx"]);

  for (const filePath of files) {
    const rel = path.relative(webSrc, filePath);
    const source = fs.readFileSync(filePath, "utf-8");
    const imports = extractImports(source);

    if (rel.startsWith(`shared${path.sep}`)) {
      for (const spec of imports) {
        if (spec.startsWith("@/modules/") || spec.includes("/modules/")) {
          addViolation("shared/* must not import from modules/*", filePath);
        }
      }
    }

    if (rel.startsWith(`modules${path.sep}`)) {
      const currentModule = moduleNameFromPath(filePath, path.join(webSrc, "modules"));
      for (const spec of imports) {
        const match = spec.match(/^@\/modules\/([^/]+)(?:\/(.+))?$/);
        if (!match) {
          continue;
        }
        const target = match[1];
        const rest = match[2];
        if (target === currentModule) {
          continue;
        }
        if (rest && rest !== "index") {
          addViolation(
            `module-to-module deep import detected: ${spec} (use module public index)`,
            filePath
          );
        }
      }
    }
  }
}

function checkBackendModuleBoundaries() {
  const files = listFiles(apiModules, [".ts"]);

  for (const filePath of files) {
    const source = fs.readFileSync(filePath, "utf-8");
    const imports = extractImports(source);
    const currentModule = moduleNameFromPath(filePath, apiModules);

    for (const spec of imports) {
      const match = spec.match(/modules\/(.+)$/);
      if (!match) {
        continue;
      }
      const afterModules = match[1];
      const target = afterModules.split("/")[0];
      const rest = afterModules.split("/").slice(1).join("/");
      if (target && target !== currentModule && rest.length > 0) {
        addViolation(
          `module-to-module deep import detected: ${spec} (use module public index)`,
          filePath
        );
      }
    }
  }
}

function checkPrismaAccess() {
  const apiSrc = path.join(repoRoot, "services", "api", "src");
  const workerSrc = path.join(repoRoot, "services", "worker", "src");
  const files = [...listFiles(apiSrc, [".ts", ".tsx"]), ...listFiles(workerSrc, [".ts", ".tsx"])];

  for (const filePath of files) {
    const rel = path.relative(repoRoot, filePath);
    if (
      rel.includes(`${path.sep}__tests__${path.sep}`) ||
      rel.includes(`${path.sep}testkit${path.sep}`) ||
      rel.includes(`${path.sep}test-harness${path.sep}`)
    ) {
      continue;
    }

    if (
      rel.includes(`${path.sep}infrastructure${path.sep}`) ||
      rel.includes(`${path.sep}adapters${path.sep}`) ||
      rel.startsWith(`packages${path.sep}data${path.sep}`)
    ) {
      continue;
    }

    const source = fs.readFileSync(filePath, "utf-8");
    if (source.includes("@prisma/client") || source.includes("PrismaService")) {
      addViolation("Prisma usage outside infrastructure/adapters", filePath);
    }
  }
}

function checkPackageCycles() {
  const packageDirs = fs
    .readdirSync(packagesDir)
    .filter((name) => fs.statSync(path.join(packagesDir, name)).isDirectory());

  const edges = new Map();
  for (const pkg of packageDirs) {
    edges.set(pkg, new Set());
    const pkgDir = path.join(packagesDir, pkg);
    const files = listFiles(pkgDir, [".ts", ".tsx"]);
    for (const filePath of files) {
      const source = fs.readFileSync(filePath, "utf-8");
      for (const spec of extractImports(source)) {
        if (!spec.startsWith("@corely/")) {
          continue;
        }
        const target = spec.split("/")[1];
        if (target && target !== pkg) {
          edges.get(pkg).add(target);
        }
      }
    }
  }

  const visiting = new Set();
  const visited = new Set();

  function visit(node, stack) {
    if (visiting.has(node)) {
      const cycle = [...stack, node].join(" -> ");
      violations.push(`packages cycle detected: ${cycle}`);
      return;
    }
    if (visited.has(node)) {
      return;
    }
    visiting.add(node);
    const next = edges.get(node) || new Set();
    for (const dep of next) {
      visit(dep, [...stack, node]);
    }
    visiting.delete(node);
    visited.add(node);
  }

  for (const node of edges.keys()) {
    visit(node, []);
  }
}

checkFrontendBoundaries();
checkBackendModuleBoundaries();
checkPrismaAccess();
checkPackageCycles();

if (violations.length > 0) {
  console.error("Architecture check failed:");
  for (const item of violations) {
    console.error(`- ${item}`);
  }
  process.exit(1);
}

console.log("Architecture check passed.");
