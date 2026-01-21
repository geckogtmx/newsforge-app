import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';
import fs from 'fs';

let mainWindow: BrowserWindow | null = null;
let serverProcess: ChildProcess | null = null;

const isDev = !app.isPackaged;
const serverPort = 3000;

/**
 * Start the Express backend server
 */
function startServer() {
  console.log('[Electron] Starting backend server...');
  
  if (isDev) {
    // In development, use tsx watch for hot reload
    const serverPath = path.join(app.getAppPath(), 'server', '_core', 'index.ts');
    console.log('[Electron] Dev mode - starting server with tsx watch');
    console.log('[Electron] Server path:', serverPath);
    
    serverProcess = spawn('pnpm', ['tsx', 'watch', serverPath], {
      cwd: app.getAppPath(),
      shell: true,
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'development' }
    });
  } else {
    // In production, run the bundled server
    const serverPath = path.join(process.resourcesPath, 'dist', 'index.js');
    console.log('[Electron] Production mode - starting bundled server');
    console.log('[Electron] Server path:', serverPath);
    
    if (!fs.existsSync(serverPath)) {
      console.error('[Electron] Server bundle not found at:', serverPath);
      return;
    }
    
    serverProcess = spawn('node', [serverPath], {
      stdio: 'inherit',
      env: { ...process.env, NODE_ENV: 'production' }
    });
  }

  serverProcess?.on('error', (error) => {
    console.error('[Electron] Server process error:', error);
  });

  serverProcess?.on('exit', (code) => {
    console.log('[Electron] Server process exited with code:', code);
  });
}

/**
 * Create the main application window
 */
function createWindow() {
  console.log('[Electron] Creating main window...');
  
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false // Required for preload script IPC
    },
    title: 'NewsForge',
    autoHideMenuBar: true,
    backgroundColor: '#0a0a0a', // Dark background for smooth loading
    show: false // Don't show until ready
  });

  // Show window when ready to avoid visual flash
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // Wait for server to be ready before loading
  const serverStartDelay = isDev ? 5000 : 2000;
  console.log(`[Electron] Waiting ${serverStartDelay}ms for server to start...`);
  
  setTimeout(() => {
    const url = `http://localhost:${serverPort}`;
    console.log('[Electron] Loading URL:', url);
    mainWindow?.loadURL(url);
  }, serverStartDelay);

  // Open DevTools in development
  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  // Handle window close
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Log any loading errors
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('[Electron] Failed to load:', errorCode, errorDescription);
  });
}

/**
 * Register IPC handlers for native operations
 */
function registerIpcHandlers() {
  // Directory picker for Obsidian export
  ipcMain.handle('select-directory', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Select Obsidian Vault Directory'
    });
    return result.canceled ? null : result.filePaths[0];
  });

  // File writer for Obsidian export
  ipcMain.handle('write-file', async (event, filePath: string, content: string) => {
    try {
      await fs.promises.writeFile(filePath, content, 'utf-8');
      return { success: true };
    } catch (error) {
      console.error('[Electron] Error writing file:', error);
      return { success: false, error: String(error) };
    }
  });

  // Get app version
  ipcMain.handle('get-app-version', () => {
    return app.getVersion();
  });

  // Window controls
  ipcMain.on('minimize-window', () => {
    mainWindow?.minimize();
  });

  ipcMain.on('maximize-window', () => {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow?.maximize();
    }
  });

  ipcMain.on('close-window', () => {
    mainWindow?.close();
  });
}

/**
 * Cleanup function to kill server process
 */
function cleanup() {
  if (serverProcess) {
    console.log('[Electron] Killing server process...');
    serverProcess.kill();
    serverProcess = null;
  }
}

// App lifecycle events
app.whenReady().then(() => {
  console.log('[Electron] App ready');
  registerIpcHandlers();
  startServer();
  createWindow();

  app.on('activate', () => {
    // On macOS, re-create window when dock icon is clicked
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  cleanup();
  // On macOS, apps typically stay active until Cmd+Q
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  cleanup();
});

app.on('will-quit', () => {
  cleanup();
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('[Electron] Uncaught exception:', error);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Electron] Unhandled rejection:', reason);
});
