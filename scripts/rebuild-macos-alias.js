#!/usr/bin/env node
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const moduleDir = path.join(projectRoot, "node_modules", "macos-alias");

if (!fs.existsSync(moduleDir)) {
  console.error("[rebuild-macos-alias] macos-alias dependency not found");
  process.exit(1);
}

const buildDir = path.join(moduleDir, "build");
try {
  fs.rmSync(buildDir, { recursive: true, force: true });
  console.log("[rebuild-macos-alias] Removed previous build artifacts");
} catch (error) {
  console.warn("[rebuild-macos-alias] Failed to clean build directory:", error);
}

const archArgs = [];
if (process.env.npm_config_target_arch) {
  archArgs.push("--arch", process.env.npm_config_target_arch);
}

const nodeGypBin = path.join(
  projectRoot,
  "node_modules",
  "node-gyp",
  "bin",
  "node-gyp.js",
);

const result = spawnSync(process.execPath, [nodeGypBin, "rebuild", ...archArgs], {
  cwd: moduleDir,
  stdio: "inherit",
});

if (result.status !== 0) {
  console.error("[rebuild-macos-alias] node-gyp rebuild failed");
  process.exit(result.status ?? 1);
}

console.log("[rebuild-macos-alias] Rebuild complete");

