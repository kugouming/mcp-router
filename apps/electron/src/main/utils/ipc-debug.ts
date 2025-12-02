import { app } from "electron";
import fs from "node:fs";
import path from "node:path";

const logFilePath = path.join(app.getPath("userData"), "ipc-debug.log");

export function logIpcDebug(message: string): void {
  try {
    const entry = `[${new Date().toISOString()}] ${message}\n`;
    fs.appendFileSync(logFilePath, entry, "utf8");
  } catch (error) {
    console.error("[IPC Debug] Failed to write debug log:", error);
  }
}

