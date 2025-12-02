import { app } from "electron";
import type { IUpdateElectronAppOptions } from "update-electron-app";
import { getSettingsService } from "@/main/modules/settings/settings.service";
import { isProduction } from "@/main/utils/environment";

type AutoUpdateConfig = {
  enabled: boolean;
  options?: IUpdateElectronAppOptions;
};

const DEFAULT_AUTO_UPDATE_OPTIONS: IUpdateElectronAppOptions = {
  notifyUser: false,
};

/**
 * Determine whether auto-update should run and return options for update-electron-app
 * Errors are swallowed to avoid crashing on environments (e.g., unsigned macOS builds)
 */
export function resolveAutoUpdateConfig(): AutoUpdateConfig {
  try {
    const envForceEnable = process.env.MCP_ENABLE_AUTO_UPDATE === "1";
    const envForceDisable = process.env.MCP_DISABLE_AUTO_UPDATE === "1";

    if (envForceDisable) {
      console.log("[AutoUpdate] Disabled via MCP_DISABLE_AUTO_UPDATE");
      return { enabled: false };
    }

    const isUnsignedDarwin =
      process.platform === "darwin" &&
      process.env.MCP_SIGNED_BUILD !== "1" &&
      !envForceEnable;

    const settingsService = getSettingsService();
    const settings = settingsService.getSettings();
    const autoUpdateEnabled =
      envForceEnable ||
      (!isUnsignedDarwin && (settings.autoUpdateEnabled ?? false));

    const shouldEnableAutoUpdate =
      !isUnsignedDarwin &&
      isProduction() &&
      app.isPackaged &&
      autoUpdateEnabled;

    if (!shouldEnableAutoUpdate) {
      return { enabled: false };
    }

    return {
      enabled: true,
      options: DEFAULT_AUTO_UPDATE_OPTIONS,
    };
  } catch {
    return { enabled: false };
  }
}
