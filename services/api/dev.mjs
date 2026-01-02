import { spawn } from "child_process";
import { once } from "events";
import { context } from "esbuild";
import { decoratorPlugin } from "./esbuild-decorator-plugin.mjs";

let nodeProcess = null;
let restartPromise = Promise.resolve();

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
};

const startNode = () => {
  console.log(
    `\n🚀 Starting server${isDebugMode ? " (Debug Mode on port " + debugPort + ")" : ""}...\n`
  );

  const nodeArgs = isDebugMode
    ? [`--inspect=0.0.0.0:${debugPort}`, "dist/main.js"]
    : ["dist/main.js"];

  nodeProcess = spawn("node", nodeArgs, {
    stdio: "inherit",
    env: { ...process.env, FORCE_COLOR: "1" },
  });
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
              await stopNode();
              startNode();
            });
          }
        });
      },
    },
  ],
});

console.log("👀 Watching for changes...\n");

await buildContext.watch();

process.on("SIGINT", () => {
  if (nodeProcess) nodeProcess.kill();
  buildContext.dispose();
  process.exit(0);
});
