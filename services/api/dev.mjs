import { spawn, spawnSync } from "child_process";
import { once } from "events";
import { watch } from "node:fs";
import net from "node:net";
import { fileURLToPath } from "node:url";
import { context } from "esbuild";
import { decoratorPlugin } from "./esbuild-decorator-plugin.mjs";

let nodeProcess = null;
let restartPromise = Promise.resolve();
let promptRestartTimer = null;
let promptWatcher = null;

const apiPort = Number(process.env.PORT || 3000);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const isPortFree = (port) =>
  new Promise((resolve) => {
    const tester = net.createServer();
    tester.once("error", () => resolve(false));
    tester.once("listening", () => {
      tester.close(() => resolve(true));
    });
    tester.listen(port, "0.0.0.0");
  });

const killPortOccupants = async (port) => {
  if (process.platform === "win32") return false;

  try {
    const { stdout } = spawnSync("lsof", ["-ti", `:${port}`], { encoding: "utf8" });
    const pids = stdout
      .split(/\s+/)
      .map((pid) => pid.trim())
      .filter(Boolean);

    if (!pids.length) return false;

    console.warn(`[dev] Port ${port} is busy; terminating PIDs ${pids.join(", ")}`);
    for (const pid of pids) {
      try {
        process.kill(Number(pid), "SIGTERM");
      } catch {
        // ignore
      }
    }

    await sleep(400);

    for (const pid of pids) {
      try {
        process.kill(Number(pid), "SIGKILL");
      } catch {
        // ignore
      }
    }

    return true;
  } catch (error) {
    console.warn(`[dev] Could not inspect port ${port}: ${error?.message ?? error}`);
    return false;
  }
};

const waitForPortToClose = async (port, attempts = 15, delayMs = 200) => {
  for (let i = 0; i < attempts; i++) {
    if (await isPortFree(port)) return true;
    await sleep(delayMs);
  }

  return await isPortFree(port);
};

const ensurePortFree = async (port) => {
  if (await isPortFree(port)) return;

  await killPortOccupants(port);

  const freed = await waitForPortToClose(port);
  if (!freed) {
    throw new Error(`Port ${port} is still busy. Set PORT or free it manually.`);
  }
};

// Check if debug mode is enabled via CLI argument or environment variable
const isDebugMode = process.argv.includes("--inspect") || process.env.NODE_DEBUG === "true";
const debugPort = process.env.DEBUG_PORT || "9229";

const stopNode = async () => {
  if (!nodeProcess) return;

  const proc = nodeProcess;
  nodeProcess = null;

  proc.kill("SIGTERM");

  try {
    await Promise.race([once(proc, "exit"), new Promise((r) => setTimeout(r, 5000))]);
  } finally {
    if (!proc.killed) {
      proc.kill("SIGKILL");
    }
  }

  // Give the OS a moment to release the port before starting again
  await ensurePortFree(apiPort);
};

const startNode = async () => {
  await ensurePortFree(apiPort);

  console.log(
    `\n🚀 Starting server${isDebugMode ? " (Debug Mode on port " + debugPort + ")" : ""}...\n`
  );

  const nodeArgs = isDebugMode
    ? [`--inspect=0.0.0.0:${debugPort}`, "dist/main.js"]
    : ["dist/main.js"];

  const childEnv = { ...process.env };
  if ("NO_COLOR" in childEnv) {
    delete childEnv.FORCE_COLOR;
  } else {
    childEnv.FORCE_COLOR = "1";
  }

  nodeProcess = spawn("node", nodeArgs, {
    stdio: "inherit",
    env: childEnv,
  });
};

const scheduleRestart = (reason) => {
  if (promptRestartTimer) {
    clearTimeout(promptRestartTimer);
  }

  promptRestartTimer = setTimeout(() => {
    promptRestartTimer = null;
    console.log(`[dev] ${reason}; restarting API to load the rebuilt package.`);
    restartPromise = restartPromise.then(async () => {
      try {
        await stopNode();
        await startNode();
      } catch (error) {
        console.error(`[dev] Failed to restart: ${error?.message ?? error}`);
      }
    });
  }, 150);
};

const buildContext = await context({
  entryPoints: ["src/main.ts"],
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  outdir: "dist",
  sourcemap: true,
  packages: "external",
  logLevel: "info",
  plugins: [
    decoratorPlugin,
    {
      name: "restart-server",
      setup(build) {
        build.onEnd((result) => {
          if (result.errors.length === 0) {
            restartPromise = restartPromise.then(async () => {
              try {
                await stopNode();
                await startNode();
              } catch (error) {
                console.error(`[dev] Failed to restart: ${error?.message ?? error}`);
              }
            });
          }
        });
      },
    },
  ],
});

console.log("👀 Watching for changes...\n");

await buildContext.watch();

const promptsDistDirectory = fileURLToPath(
  new URL("../../packages/prompts/dist/", import.meta.url)
);

try {
  promptWatcher = watch(promptsDistDirectory, (eventType, filename) => {
    const changedFile = filename?.toString();
    if (!changedFile || /^index\.(?:mjs|cjs)$/.test(changedFile)) {
      scheduleRestart(`@corely/prompts ${eventType}`);
    }
  });
  console.log("👀 Watching @corely/prompts build output for changes...\n");
} catch (error) {
  console.warn(`[dev] Could not watch @corely/prompts build output: ${error?.message ?? error}`);
}

process.on("SIGINT", async () => {
  if (promptRestartTimer) {
    clearTimeout(promptRestartTimer);
  }
  promptWatcher?.close();
  await stopNode();
  buildContext.dispose();
  process.exit(0);
});
