#!/usr/bin/env node
const { spawnSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const moduleDir = path.join(projectRoot, "node_modules", "macos-alias");

if (!fs.existsSync(moduleDir)) {
  console.error("[rebuild-macos-alias-universal] macos-alias dependency not found");
  process.exit(1);
}

const buildDir = path.join(moduleDir, "build");
const releaseDir = path.join(buildDir, "Release");
const binaryName = "volume.node";

function cleanBuildArtifacts() {
  try {
    fs.rmSync(buildDir, { recursive: true, force: true });
    console.log("[rebuild-macos-alias-universal] Removed previous build artifacts");
  } catch (error) {
    console.warn("[rebuild-macos-alias-universal] Failed to clean build directory:", error);
  }
}

cleanBuildArtifacts();

const nodeGypBin = path.join(
  projectRoot,
  "node_modules",
  "node-gyp",
  "bin",
  "node-gyp.js",
);

const architectures = ["x64", "arm64"];
const archivedBinaries = [];

for (const arch of architectures) {
  console.log(`[rebuild-macos-alias-universal] Rebuilding for ${arch}...`);
  const result = spawnSync(process.execPath, [nodeGypBin, "rebuild", "--arch", arch], {
    cwd: moduleDir,
    stdio: "inherit",
    env: {
      ...process.env,
      npm_config_target_arch: arch,
      npm_config_arch: arch,
    },
  });

  if (result.status !== 0) {
    console.error(`[rebuild-macos-alias-universal] node-gyp rebuild failed for ${arch}`);
    process.exit(result.status ?? 1);
  }

  const builtBinaryPath = path.join(releaseDir, binaryName);
  if (!fs.existsSync(builtBinaryPath)) {
    console.error(
      `[rebuild-macos-alias-universal] Missing built binary at ${builtBinaryPath} for ${arch}`,
    );
    process.exit(1);
  }

  const archivedBinaryPath = path.join(moduleDir, `${binaryName}.${arch}`);
  fs.copyFileSync(builtBinaryPath, archivedBinaryPath);
  archivedBinaries.push(archivedBinaryPath);
  console.log(`[rebuild-macos-alias-universal] Archived ${arch} binary -> ${archivedBinaryPath}`);

  // Clean up between rebuilds so artifacts do not leak into the next architecture
  const isLastArch = arch === architectures[architectures.length - 1];
  if (!isLastArch) {
    cleanBuildArtifacts();
  }
}

if (archivedBinaries.length !== architectures.length) {
  console.error("[rebuild-macos-alias-universal] Failed to capture all architecture binaries");
  process.exit(1);
}

console.log("[rebuild-macos-alias-universal] Creating universal binary via lipo...");
const universalBinaryPath = path.join(releaseDir, binaryName);
fs.mkdirSync(releaseDir, { recursive: true });
const lipoResult = spawnSync("lipo", ["-create", "-output", universalBinaryPath, ...archivedBinaries], {
  stdio: "inherit",
});

if (lipoResult.status !== 0) {
  console.error("[rebuild-macos-alias-universal] Failed to create universal binary with lipo");
  process.exit(lipoResult.status ?? 1);
}

for (const archivedBinaryPath of archivedBinaries) {
  try {
    fs.rmSync(archivedBinaryPath);
  } catch (error) {
    console.warn(
      `[rebuild-macos-alias-universal] Failed to remove temporary binary ${archivedBinaryPath}:`,
      error,
    );
  }
}

console.log("[rebuild-macos-alias-universal] Universal binary ready");


