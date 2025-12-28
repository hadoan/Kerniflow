import { spawn } from "child_process";
import { context } from "esbuild";
import { decoratorPlugin } from "./esbuild-decorator-plugin.mjs";

let nodeProcess = null;

// Check if debug mode is enabled via CLI argument or environment variable
const isDebugMode = process.argv.includes("--inspect") || process.env.NODE_DEBUG === "true";
const debugPort = process.env.DEBUG_PORT || "9229";

const startNode = () => {
  if (nodeProcess) {
    nodeProcess.kill();
  }
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
            startNode();
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
