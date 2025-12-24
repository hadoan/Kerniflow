import { spawn } from "child_process";
import { context } from "esbuild";

let nodeProcess = null;

const startNode = () => {
  if (nodeProcess) {
    nodeProcess.kill();
  }
  console.log("\n🚀 Starting worker...\n");
  nodeProcess = spawn("node", ["dist/main.js"], {
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
  tsconfig: "tsconfig.json",
  logLevel: "info",
  plugins: [
    {
      name: "restart-worker",
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
