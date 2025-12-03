import { ipcMain } from "electron";
import { setupAuthHandlers } from "../modules/auth/auth.ipc";
import { setupMcpServerHandlers } from "../modules/mcp-server-manager/mcp-server-manager.ipc";
import { setupLogHandlers } from "../modules/mcp-logger/mcp-logger.ipc";
import { setupSettingsHandlers } from "../modules/settings/settings.ipc";
import { setupMcpAppsHandlers } from "../modules/mcp-apps-manager/mcp-apps-manager.ipc";
import { setupSystemHandlers } from "../modules/system/system-handler";
import { setupPackageHandlers } from "../modules/system/package-handlers";
import { setupWorkspaceHandlers } from "../modules/workspace/workspace.ipc";
import { setupWorkflowHandlers } from "../modules/workflow/workflow.ipc";
import { setupHookHandlers } from "../modules/workflow/hook.ipc";
import { setupProjectHandlers } from "../modules/projects/projects.ipc";
import type { MCPServerManager } from "@/main/modules/mcp-server-manager/mcp-server-manager";
import { logIpcDebug } from "../utils/ipc-debug";

/**
 * IPC通信ハンドラのセットアップを行う関数
 * アプリケーション初期化時に呼び出される
 */
export function setupIpcHandlers(deps: {
  getServerManager: () => MCPServerManager;
}): void {
  console.log("[IPC Setup] Starting IPC handlers setup...");
  logIpcDebug("[IPC Setup] Starting IPC handlers setup");

  try {
    // 認証関連
    console.log("[IPC Setup] Setting up auth handlers...");
    setupAuthHandlers();
    console.log("[IPC Setup] Auth handlers setup complete");

    // MCPサーバー関連
    console.log("[IPC Setup] Setting up MCP server handlers...");
    setupMcpServerHandlers(deps.getServerManager);
    console.log("[IPC Setup] MCP server handlers setup complete");

    // ログ関連
    console.log("[IPC Setup] Setting up log handlers...");
    setupLogHandlers();
    console.log("[IPC Setup] Log handlers setup complete");

    // 設定関連
    console.log("[IPC Setup] Setting up settings handlers...");
    setupSettingsHandlers();
    console.log("[IPC Setup] Settings handlers setup complete");

    // MCPアプリ設定関連
    console.log("[IPC Setup] Setting up MCP apps handlers...");
    setupMcpAppsHandlers();
    console.log("[IPC Setup] MCP apps handlers setup complete");
    logIpcDebug("[IPC Setup] MCP apps handlers setup complete");
    
    // Note: Handler verification is done inside setupMcpAppsHandlers()
    // The internal handler map may not be immediately accessible due to Electron's
    // internal implementation, but handlers are registered successfully

    // システム関連（ユーティリティ、フィードバック、アップデート）
    console.log("[IPC Setup] Setting up system handlers...");
    setupSystemHandlers();
    console.log("[IPC Setup] System handlers setup complete");

    // パッケージ関連（バージョン解決とマネージャー管理）
    console.log("[IPC Setup] Setting up package handlers...");
    setupPackageHandlers();
    console.log("[IPC Setup] Package handlers setup complete");

    // ワークスペース関連
    console.log("[IPC Setup] Setting up workspace handlers...");
    setupWorkspaceHandlers();
    console.log("[IPC Setup] Workspace handlers setup complete");
    logIpcDebug("[IPC Setup] Workspace handlers setup complete");
    
    // Verify workspace handler registration with retries
    const verifyWorkspaceHandler = (): boolean => {
      const ipcMainInternal = ipcMain as any;
      const handlerMap = ipcMainInternal._handlers || ipcMainInternal.listeners || {};
      return Boolean(handlerMap["workspace:create"]);
    };

    const maxWorkspaceRetries = 3;
    let workspaceVerified = verifyWorkspaceHandler();
    let attempt = 1;

    if (workspaceVerified) {
      console.log("[IPC Setup] ✓ Verified workspace:create handler is registered");
      logIpcDebug("[IPC Setup] workspace:create handler verified");
    } else {
      logIpcDebug("[IPC Setup] workspace:create handler missing after initial setup");
    }

    while (!workspaceVerified && attempt <= maxWorkspaceRetries) {
      console.warn(
        `[IPC Setup] workspace:create handler missing (attempt ${attempt}/${maxWorkspaceRetries}). Retrying registration...`,
      );
      logIpcDebug(
        `[IPC Setup] workspace:create handler retry ${attempt}/${maxWorkspaceRetries}`,
      );
      try {
        setupWorkspaceHandlers();
      } catch (retryError) {
        console.error("[IPC Setup] Retry failed for workspace handlers:", retryError);
        logIpcDebug(
          `[IPC Setup] workspace handler retry failed: ${
            retryError instanceof Error ? retryError.message : String(retryError)
          }`,
        );
      }
      workspaceVerified = verifyWorkspaceHandler();
      if (workspaceVerified) {
        console.log("[IPC Setup] ✓ Verified workspace:create handler after retry");
        logIpcDebug("[IPC Setup] workspace:create handler verified after retry");
        break;
      }
      attempt += 1;
    }

    if (!workspaceVerified) {
      // This is not necessarily a critical error - Electron's internal structure may not expose handlers this way
      // The handlers are registered via ipcMain.handle() which is the correct API
      console.log("[IPC Setup] Note: workspace:create handler not found in internal map (this may be normal)");
      logIpcDebug("[IPC Setup] workspace:create handler not found in internal map");
      const ipcMainInternal = ipcMain as any;
      const handlerMap = ipcMainInternal._handlers || ipcMainInternal.listeners || {};
      const availableHandlers = Object.keys(handlerMap).filter((k: string) => k.startsWith("workspace:"));
      if (availableHandlers.length > 0) {
        console.log("[IPC Setup] Available workspace handlers in map:", availableHandlers);
      } else {
        console.log("[IPC Setup] No workspace handlers found in internal map (handlers are registered via ipcMain.handle())");
      }
    }

    // Workflow関連
    console.log("[IPC Setup] Setting up workflow handlers...");
    setupWorkflowHandlers();
    console.log("[IPC Setup] Workflow handlers setup complete");

    // Hook Module関連
    console.log("[IPC Setup] Setting up hook handlers...");
    setupHookHandlers();
    console.log("[IPC Setup] Hook handlers setup complete");

    // Projects関連
    console.log("[IPC Setup] Setting up project handlers...");
    setupProjectHandlers({ getServerManager: deps.getServerManager });
    console.log("[IPC Setup] Project handlers setup complete");
    
    console.log("[IPC Setup] ========== All IPC handlers setup completed ==========");
  } catch (error) {
    console.error("[IPC Setup] FATAL ERROR during IPC handlers setup:", error);
    console.error("[IPC Setup] Error stack:", error instanceof Error ? error.stack : "No stack trace");
    throw error;
  }
}
