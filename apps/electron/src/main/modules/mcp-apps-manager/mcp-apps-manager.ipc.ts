import { ipcMain } from "electron";
import {
  listMcpApps,
  updateAppServerAccess,
  addApp,
  unifyAppConfig,
  deleteCustomApp,
} from "./mcp-apps-manager.service";
import type { TokenServerAccess } from "@kugouming/shared";

export function setupMcpAppsHandlers(): void {
  console.log("[MCP Apps] ========== Starting setupMcpAppsHandlers ==========");
  console.log("[MCP Apps] ipcMain available:", !!ipcMain);
  console.log("[MCP Apps] Service functions available:", {
    listMcpApps: typeof listMcpApps,
    updateAppServerAccess: typeof updateAppServerAccess,
    addApp: typeof addApp,
    unifyAppConfig: typeof unifyAppConfig,
    deleteCustomApp: typeof deleteCustomApp,
  });
  
  if (!ipcMain) {
    const error = new Error("ipcMain is not available in setupMcpAppsHandlers");
    console.error("[MCP Apps] FATAL ERROR:", error);
    throw error;
  }
  
  if (typeof addApp !== "function") {
    const error = new Error(`addApp is not a function, got: ${typeof addApp}`);
    console.error("[MCP Apps] FATAL ERROR:", error);
    throw error;
  }
  
  console.log("[MCP Apps] All imports verified, proceeding with handler registration...");
  
  try {
    // Remove existing handlers if they exist (for hot reload support)
    ipcMain.removeHandler("mcp-apps:list");
    ipcMain.removeHandler("mcp-apps:delete");
    ipcMain.removeHandler("mcp-apps:add");
    ipcMain.removeHandler("mcp-apps:update-server-access");
    ipcMain.removeHandler("mcp-apps:unify");
    console.log("[MCP Apps] Removed existing handlers");
  } catch (error) {
    console.warn("[MCP Apps] Error removing handlers (may not exist):", error);
  }
  
  console.log("[MCP Apps] Registering mcp-apps:list handler");
  ipcMain.handle("mcp-apps:list", async () => {
    try {
      return await listMcpApps();
    } catch (error) {
      console.error("Failed to list MCP apps:", error);
      return [];
    }
  });

  console.log("[MCP Apps] Registering mcp-apps:delete handler");
  ipcMain.handle("mcp-apps:delete", async (_, appName: string) => {
    try {
      return await deleteCustomApp(appName);
    } catch (error) {
      console.error(`Failed to delete custom app ${appName}:`, error);
      return false;
    }
  });

  console.log("[MCP Apps] Registering mcp-apps:add handler");
  const addHandler = async (_: Electron.IpcMainInvokeEvent, appName: string) => {
    console.log(`[MCP Apps] mcp-apps:add handler called with appName: ${appName}`);
    try {
      const result = await addApp(appName);
      console.log(`[MCP Apps] mcp-apps:add handler completed successfully`);
      return result;
    } catch (error) {
      console.error(`[MCP Apps] Failed to add MCP config to ${appName}:`, error);
      return {
        success: false,
        message: `Error adding MCP configuration to ${appName}: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  };
  ipcMain.handle("mcp-apps:add", addHandler);
  console.log("[MCP Apps] mcp-apps:add handler registered, verifying...");
  
  // Verify handler is actually registered
  try {
    // Try to check if handler exists by attempting to remove it (will fail if not registered)
    // This is a workaround since Electron doesn't provide a direct way to check
    const testHandler = (ipcMain as any)._handlers?.["mcp-apps:add"];
    if (testHandler) {
      console.log("[MCP Apps] ✓ mcp-apps:add handler verified as registered");
    } else {
      console.warn("[MCP Apps] ⚠ Warning: Could not verify mcp-apps:add handler registration");
    }
  } catch (verifyError) {
    console.warn("[MCP Apps] Could not verify handler registration:", verifyError);
  }

  console.log("[MCP Apps] Registering mcp-apps:update-server-access handler");
  ipcMain.handle(
    "mcp-apps:update-server-access",
    async (_, appName: string, serverAccess: TokenServerAccess) => {
      try {
        return await updateAppServerAccess(appName, serverAccess);
      } catch (error) {
        console.error(`Failed to update server access for ${appName}:`, error);
        return {
          success: false,
          message: `Error updating server access for ${appName}: ${error instanceof Error ? error.message : String(error)}`,
        };
      }
    },
  );

  console.log("[MCP Apps] Registering mcp-apps:unify handler");
  ipcMain.handle("mcp-apps:unify", async (_, appName: string) => {
    try {
      return await unifyAppConfig(appName);
    } catch (error) {
      console.error(`Failed to unify config for ${appName}:`, error);
      return {
        success: false,
        message: `Error unifying configuration for ${appName}: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  });

  // Verify handlers are registered
  const handlers = [
    "mcp-apps:list",
    "mcp-apps:delete", 
    "mcp-apps:add",
    "mcp-apps:update-server-access",
    "mcp-apps:unify"
  ];
  
  const registeredHandlers = handlers.filter(handler => {
    // Check if handler is registered by trying to get listener count
    // Note: ipcMain.listenerCount doesn't exist, so we'll just log
    return true; // Assume registered if no error thrown
  });
  
  console.log(`[MCP Apps] Successfully registered ${handlers.length} IPC handlers:`, handlers);
  
  // Double-check by verifying ipcMain is available
  if (!ipcMain) {
    console.error("[MCP Apps] ERROR: ipcMain is not available!");
    throw new Error("ipcMain is not available");
  }
  
  // Final verification: Try to access internal handlers map
  // Note: Electron's internal handler map structure may vary, so this is just for logging
  try {
    const ipcMainInternal = ipcMain as any;
    const handlerMap = ipcMainInternal._handlers || ipcMainInternal.listeners || {};
    const registeredCount = Object.keys(handlerMap).filter((key: string) => 
      key.startsWith("mcp-apps:")
    ).length;
    console.log(`[MCP Apps] Verified ${registeredCount} mcp-apps handlers in internal map`);
    
    // Specifically check mcp-apps:add
    if (handlerMap["mcp-apps:add"]) {
      console.log("[MCP Apps] ✓ mcp-apps:add confirmed in handler map");
    } else {
      // This is not necessarily an error - Electron's internal structure may not expose handlers this way
      // The handlers are registered via ipcMain.handle() which is the correct API
      console.log("[MCP Apps] Note: mcp-apps:add not found in internal map (this may be normal)");
      const availableHandlers = Object.keys(handlerMap).filter((k: string) => k.startsWith("mcp-apps:"));
      if (availableHandlers.length > 0) {
        console.log("[MCP Apps] Available handlers in map:", availableHandlers);
      }
    }
  } catch (verifyError) {
    // Not a critical error - handlers are registered via ipcMain.handle() API
    console.log("[MCP Apps] Could not access internal handler map (this is normal):", verifyError);
  }
  
  console.log("[MCP Apps] ========== MCP apps IPC handlers setup completed ==========");
}
