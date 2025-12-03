import type { ForgeConfig } from "@electron-forge/shared-types";
import { MakerSquirrel } from "@electron-forge/maker-squirrel";
import { MakerZIP } from "@electron-forge/maker-zip";
import { AutoUnpackNativesPlugin } from "@electron-forge/plugin-auto-unpack-natives";
import { WebpackPlugin } from "@electron-forge/plugin-webpack";
import { FusesPlugin } from "@electron-forge/plugin-fuses";
import { FuseV1Options, FuseVersion } from "@electron/fuses";

import { mainConfig } from "./webpack.main.config";
import { rendererConfig } from "./webpack.renderer.config";
import { MakerDMG } from "@electron-forge/maker-dmg";
import * as path from "path";

// eslint-disable-next-line @typescript-eslint/no-var-requires
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });


const isMac = process.platform === "darwin";
const hasSignIdentity = !!process.env.PUBLIC_IDENTIFIER;
const hasNotarizeCreds = !!(
  process.env.APPLE_API_KEY &&
  process.env.APPLE_API_KEY_ID &&
  process.env.APPLE_API_ISSUER
);

// Determine target architecture(s)
// If BUILD_UNIVERSAL is set, build for both x64 and arm64 (Universal Binary)
// Otherwise, use the specified arch or default to current arch
const getTargetArch = (): string | string[] => {
  if (process.env.BUILD_UNIVERSAL === "true") {
    return ["x64", "arm64"];
  }
  return (process.env.npm_config_target_arch as any) || process.arch;
};

const targetArch = getTargetArch();
const isUniversal = Array.isArray(targetArch);

const config: ForgeConfig = {
  packagerConfig: {
    asar: true,
    icon: "./public/images/icon/icon",
    // Support both Intel and Apple Silicon architectures
    // For Universal Binary, use array of architectures
    arch: targetArch,
    // Only sign/notarize on macOS when credentials are available (CI-safe)
    osxSign: isMac && hasSignIdentity
      ? {
          identity: process.env.PUBLIC_IDENTIFIER,
        }
      : undefined,
    osxNotarize: isMac && hasNotarizeCreds
      ? {
          appleApiKey: process.env.APPLE_API_KEY || "",
          appleApiKeyId: process.env.APPLE_API_KEY_ID || "",
          appleApiIssuer: process.env.APPLE_API_ISSUER || "",
        }
      : undefined,
  },
  rebuildConfig: {
    // Force rebuild native modules for the target architecture(s)
    // For Universal Binary, Electron Forge will automatically rebuild for both architectures
    // For single arch, use the specified arch
    arch: isUniversal ? ["x64", "arm64"] : targetArch,
  },
  makers: [
    new MakerSquirrel({
      name: "MCP-Router",
      authors: "fjm2u",
      description:
        "Effortlessly manage your MCP servers with the MCP Router. MCP Router provides a user-friendly interface for managing MCP servers, making it easier than ever to work with the MCP.",
      setupIcon: "./public/images/icon/icon.ico",
    }),
    new MakerDMG(
      {
        name: "MCP Router",
        format: "ULFO",
        icon: "./public/images/icon/icon.icns",
      },
      ["darwin"],
    ),
    new MakerZIP(),
  ],
  plugins: [
    new AutoUnpackNativesPlugin({}),
    new WebpackPlugin({
      mainConfig,
      renderer: {
        config: rendererConfig,
        entryPoints: [
          {
            html: "./src/index.html",
            js: "./src/renderer.tsx",
            name: "main_window",
            preload: {
              js: "./src/preload.ts",
            },
          },
        ],
      },
    }),
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: false,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: true,
    }),
  ],
  publishers: [
    {
      name: "@electron-forge/publisher-github",
      config: {
        authToken: process.env.GITHUB_TOKEN,
        repository: {
          owner: "mcp-router",
          name: "mcp-router",
        },
        prerelease: true,
        draft: true,
      },
    },
  ],
};

export default config;
