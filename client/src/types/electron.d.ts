/**
 * TypeScript definitions for Electron API exposed via preload script
 * This ensures type safety when using window.electronAPI in the renderer process
 */

export interface ElectronAPI {
  // File system operations
  selectDirectory: () => Promise<string | null>;
  writeFile: (path: string, content: string) => Promise<{ success: boolean; error?: string }>;
  
  // App information
  getAppVersion: () => Promise<string>;
  
  // Window controls
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
  
  // Environment detection
  isElectron: boolean;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export {};
