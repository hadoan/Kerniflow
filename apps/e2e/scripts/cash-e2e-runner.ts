import { spawn } from "child_process";
import { Client } from "pg";
import dotenv from "dotenv";
import path from "path";

import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load root .env
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

async function checkDatabaseSafety() {
  const adminUrl = process.env.E2E_DATABASE_ADMIN_URL;
  const dbUrl = process.env.E2E_DATABASE_URL;

  if (!adminUrl || !dbUrl) {
    throw new Error("E2E_DATABASE_ADMIN_URL and E2E_DATABASE_URL must be set in .env");
  }

  const dbNameMatch = dbUrl.match(/\/([^\/?]+)(\?|$)/);
  if (!dbNameMatch) throw new Error("Could not parse database name from E2E_DATABASE_URL");
  const dbName = dbNameMatch[1];

  if (!dbName.includes("_e2e") && !dbName.includes("_test")) {
    throw new Error(
      "E2E_DATABASE_URL must contain '_e2e' or '_test' to prevent destruction of dev data."
    );
  }

  if (process.env.DATABASE_URL === dbUrl) {
    throw new Error(
      "E2E_DATABASE_URL cannot be the exact same as DATABASE_URL to avoid conflicts."
    );
  }

  return { adminUrl, dbUrl, dbName };
}

async function provisionDatabase(adminUrl: string, dbName: string) {
  console.log(`Connecting to admin DB to ensure ${dbName} exists...`);
  const client = new Client({ connectionString: adminUrl });
  try {
    await client.connect();
    const result = await client.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]);
    if (result.rowCount === 0) {
      console.log(`Database ${dbName} does not exist. Creating...`);
      await client.query(`CREATE DATABASE ${dbName}`);
      console.log(`Created database ${dbName}.`);
    } else {
      console.log(`Database ${dbName} already exists.`);
    }
  } finally {
    await client.end();
  }
}

function runCommand(command: string, args: string[], env: NodeJS.ProcessEnv): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      stdio: "inherit",
      env: { ...process.env, ...env },
      shell: true,
    });
    proc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`Command ${command} ${args.join(" ")} failed with code ${code}`));
    });
  });
}

async function run() {
  try {
    console.log("======================================");
    console.log("Starting Cash E2E Local Run");
    console.log("======================================");

    const { adminUrl, dbUrl, dbName } = await checkDatabaseSafety();

    await provisionDatabase(adminUrl, dbName);

    console.log("Running Prisma schema push (sync)...");
    await runCommand(
      "pnpm",
      ["--filter", "@corely/data", "exec", "prisma", "db", "push", "--accept-data-loss"],
      {
        DATABASE_URL: dbUrl,
      }
    );

    console.log("Starting E2E API and Web servers on dedicated ports...");
    const e2eEnv = {
      DATABASE_URL: dbUrl,
      NODE_ENV: "test",
      ENABLE_E2E_AUTH: "true",
      E2E_AI_PROVIDER: "deterministic",
      TZ: "Europe/Berlin",
      PORT: process.env.E2E_API_PORT || "3101",
      VITE_API_BASE_URL: process.env.E2E_API_URL || "http://localhost:3101",
    };

    // Spawn servers in background
    const apiProc = spawn("pnpm", ["--filter", "@corely/api", "dev:esbuild"], {
      env: { ...process.env, ...e2eEnv },
      shell: true,
      stdio: "inherit",
    });

    const webProc = spawn(
      "pnpm",
      [
        "--filter",
        "@corely/cash-management",
        "dev",
        "--host",
        "0.0.0.0",
        "--port",
        process.env.E2E_WEB_PORT || "3100",
      ],
      {
        env: { ...process.env, ...e2eEnv },
        shell: true,
        stdio: "inherit",
      }
    );

    const cleanup = () => {
      console.log("Shutting down E2E servers...");
      apiProc.kill();
      webProc.kill();
    };

    process.on("SIGINT", cleanup);
    process.on("SIGTERM", cleanup);

    // Give servers a few seconds to boot, playwright webServer config can also wait,
    // but playwright's config will be hitting our pre-spawned servers.
    console.log("Waiting for servers to boot up (10s)...");
    await new Promise((resolve) => setTimeout(resolve, 10000));

    // Wait for health check
    console.log("Checking API health endpoint...");
    const healthUrl = `${process.env.E2E_API_URL || "http://127.0.0.1:3101"}/test/health`;

    // Attempt health check with basic retry
    let healthOk = false;
    let lastError = null;
    for (let i = 0; i < 10; i++) {
      try {
        const res = await fetch(healthUrl, {
          method: "POST",
          headers: {
            "X-Test-Secret": process.env.TEST_HARNESS_SECRET || "test-secret-key",
          },
        });
        if (res.ok) {
          healthOk = true;
          console.log("API health check passed.");
          break;
        } else {
          lastError = new Error(`HTTP Error ${res.status}: ${await res.text()}`);
        }
      } catch (err) {
        lastError = err;
      }
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    if (!healthOk) {
      cleanup();
      console.error("Health check failed. Last error:", lastError);
      throw new Error(`API health check failed at ${healthUrl}.`);
    }

    console.log("Running Playwright tests...");
    const testArgs =
      process.argv.slice(2).length > 0 ? process.argv.slice(2) : ["tests/cash-management/specs"];
    try {
      await runCommand(
        "playwright",
        ["test", "--config", "playwright.cash.config.ts", ...testArgs],
        {
          CASH_BASE_URL: process.env.E2E_BASE_URL || "http://localhost:3100",
          DATABASE_URL: dbUrl,
          API_URL: process.env.E2E_API_URL || "http://127.0.0.1:3101",
        }
      );
    } finally {
      cleanup();
    }
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
