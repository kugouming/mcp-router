import { ipcMain } from "electron";
import { getWorkspaceService } from "@/main/modules/workspace/workspace.service";
import type { WorkspaceCreateConfig } from "@kugouming/shared";

/**
 * ワークスペース関連のIPCハンドラーを登録
 */
export function setupWorkspaceHandlers(): void {
  console.log("[Workspace] ========== Starting setupWorkspaceHandlers ==========");
  
  try {
    // Remove existing handlers if they exist (for hot reload support)
    ipcMain.removeHandler("workspace:list");
    ipcMain.removeHandler("workspace:create");
    ipcMain.removeHandler("workspace:update");
    ipcMain.removeHandler("workspace:delete");
    ipcMain.removeHandler("workspace:switch");
    ipcMain.removeHandler("workspace:current");
    ipcMain.removeHandler("workspace:get-credentials");
    console.log("[Workspace] Removed existing handlers");
  } catch (error) {
    console.warn("[Workspace] Error removing handlers (may not exist):", error);
  }

  // ワークスペース一覧取得
  console.log("[Workspace] Registering workspace:list handler");
  ipcMain.handle("workspace:list", async () => {
    return getWorkspaceService().list();
  });

  // ワークスペース作成
  console.log("[Workspace] Registering workspace:create handler");
  ipcMain.handle(
    "workspace:create",
    async (_, config: WorkspaceCreateConfig) => {
      console.log(`[Workspace] workspace:create called with config:`, config);
      try {
        const result = await getWorkspaceService().create(config);
        console.log(`[Workspace] workspace:create completed successfully`);
        return result;
      } catch (error) {
        console.error(`[Workspace] Failed to create workspace:`, error);
        throw error;
      }
    },
  );

  // ワークスペース更新
  console.log("[Workspace] Registering workspace:update handler");
  ipcMain.handle("workspace:update", async (_, id: string, updates: any) => {
    await getWorkspaceService().update(id, updates);
    return { success: true };
  });

  // ワークスペース削除
  console.log("[Workspace] Registering workspace:delete handler");
  ipcMain.handle("workspace:delete", async (_, id: string) => {
    await getWorkspaceService().delete(id);
    return { success: true };
  });

  // ワークスペース切り替え
  console.log("[Workspace] Registering workspace:switch handler");
  ipcMain.handle("workspace:switch", async (_, workspaceId: string) => {
    await getWorkspaceService().switchWorkspace(workspaceId);

    // Platform APIマネージャーがワークスペース切り替えイベントをリッスンしているため、
    // 自動的にPlatform APIの再初期化が行われる

    return { success: true };
  });

  // 現在のワークスペース取得
  console.log("[Workspace] Registering workspace:current handler");
  ipcMain.handle("workspace:current", async () => {
    return getWorkspaceService().getActiveWorkspace();
  });

  // ワークスペース認証情報取得（復号化）
  console.log("[Workspace] Registering workspace:get-credentials handler");
  ipcMain.handle(
    "workspace:get-credentials",
    async (_, workspaceId: string) => {
      const token =
        await getWorkspaceService().getWorkspaceCredentials(workspaceId);
      return { token };
    },
  );
  
  console.log("[Workspace] ========== Workspace IPC handlers setup completed ==========");
}
