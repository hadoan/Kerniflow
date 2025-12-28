#!/usr/bin/env node
import { spawn } from "child_process";
import { watch } from "fs";

let nodeProcess = null;
let buildProcess = null;

// Check if debug mode is enabled
const isDebugMode = process.argv.includes("--inspect") || process.env.NODE_DEBUG === "true";
const debugPort = process.env.DEBUG_PORT || "9229";

const startNode = () => {
  if (nodeProcess) {
    console.log("🔄 Restarting server...");
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

// Start TypeScript compiler in watch mode
console.log("🔨 Starting TypeScript compiler in watch mode...");

buildProcess = spawn("pnpm", ["exec", "tsc", "-w", "-p", "tsconfig.json"], {
  stdio: "pipe",
  shell: true,
  env: { ...process.env, FORCE_COLOR: "1" },
});

let initialBuildComplete = false;

buildProcess.stdout.on("data", (data) => {
  const output = data.toString();
  console.log(output);

  // Check if initial compilation is complete or if a rebuild happened
  if (output.includes("Watching for file changes") || output.includes("Found 0 errors")) {
    if (!initialBuildComplete) {
      initialBuildComplete = true;
      startNode();
    } else {
      // Restart on subsequent builds
      startNode();
    }
  }
});

buildProcess.stderr.on("data", (data) => {
  console.error(data.toString());
});

process.on("SIGINT", () => {
  if (nodeProcess) nodeProcess.kill();
  if (buildProcess) buildProcess.kill();
  process.exit(0);
});
