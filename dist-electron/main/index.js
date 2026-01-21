import { app, BrowserWindow, ipcMain, dialog } from "electron";
import path from "path";
import { spawn } from "child_process";
import fs from "fs";
import __cjs_mod__ from "node:module";
const __filename = import.meta.filename;
const __dirname = import.meta.dirname;
const require2 = __cjs_mod__.createRequire(import.meta.url);
let mainWindow = null;
let serverProcess = null;
const isDev = !app.isPackaged;
const serverPort = 3e3;
function startServer() {
  console.log("[Electron] Starting backend server...");
  if (isDev) {
    const serverPath = path.join(app.getAppPath(), "server", "_core", "index.ts");
    console.log("[Electron] Dev mode - starting server with tsx watch");
    console.log("[Electron] Server path:", serverPath);
    serverProcess = spawn("pnpm", ["tsx", "watch", serverPath], {
      cwd: app.getAppPath(),
      shell: true,
      stdio: "inherit",
      env: { ...process.env, NODE_ENV: "development" }
    });
  } else {
    const serverPath = path.join(process.resourcesPath, "dist", "index.js");
    console.log("[Electron] Production mode - starting bundled server");
    console.log("[Electron] Server path:", serverPath);
    if (!fs.existsSync(serverPath)) {
      console.error("[Electron] Server bundle not found at:", serverPath);
      return;
    }
    serverProcess = spawn("node", [serverPath], {
      stdio: "inherit",
      env: { ...process.env, NODE_ENV: "production" }
    });
  }
  serverProcess?.on("error", (error) => {
    console.error("[Electron] Server process error:", error);
  });
  serverProcess?.on("exit", (code) => {
    console.log("[Electron] Server process exited with code:", code);
  });
}
function createWindow() {
  console.log("[Electron] Creating main window...");
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
      // Required for preload script IPC
    },
    title: "NewsForge",
    autoHideMenuBar: true,
    backgroundColor: "#0a0a0a",
    // Dark background for smooth loading
    show: false
    // Don't show until ready
  });
  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });
  const serverStartDelay = isDev ? 5e3 : 2e3;
  console.log(`[Electron] Waiting ${serverStartDelay}ms for server to start...`);
  setTimeout(() => {
    const url = `http://localhost:${serverPort}`;
    console.log("[Electron] Loading URL:", url);
    mainWindow?.loadURL(url);
  }, serverStartDelay);
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
  mainWindow.webContents.on("did-fail-load", (event, errorCode, errorDescription) => {
    console.error("[Electron] Failed to load:", errorCode, errorDescription);
  });
}
function registerIpcHandlers() {
  ipcMain.handle("select-directory", async () => {
    const result = await dialog.showOpenDialog({
      properties: ["openDirectory"],
      title: "Select Obsidian Vault Directory"
    });
    return result.canceled ? null : result.filePaths[0];
  });
  ipcMain.handle("write-file", async (event, filePath, content) => {
    try {
      await fs.promises.writeFile(filePath, content, "utf-8");
      return { success: true };
    } catch (error) {
      console.error("[Electron] Error writing file:", error);
      return { success: false, error: String(error) };
    }
  });
  ipcMain.handle("get-app-version", () => {
    return app.getVersion();
  });
  ipcMain.on("minimize-window", () => {
    mainWindow?.minimize();
  });
  ipcMain.on("maximize-window", () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });
  ipcMain.on("close-window", () => {
    mainWindow?.close();
  });
}
function cleanup() {
  if (serverProcess) {
    console.log("[Electron] Killing server process...");
    serverProcess.kill();
    serverProcess = null;
  }
}
app.whenReady().then(() => {
  console.log("[Electron] App ready");
  registerIpcHandlers();
  startServer();
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
app.on("window-all-closed", () => {
  cleanup();
  if (process.platform !== "darwin") {
    app.quit();
  }
});
app.on("before-quit", () => {
  cleanup();
});
app.on("will-quit", () => {
  cleanup();
});
process.on("uncaughtException", (error) => {
  console.error("[Electron] Uncaught exception:", error);
});
process.on("unhandledRejection", (reason) => {
  console.error("[Electron] Unhandled rejection:", reason);
});
