import { contextBridge, ipcRenderer } from 'electron';

/**
 * Electron API exposed to the renderer process
 * This provides a secure bridge for native operations
 */
const electronAPI = {
  // File system operations for Obsidian export
  selectDirectory: (): Promise<string | null> => {
    return ipcRenderer.invoke('select-directory');
  },

  writeFile: (path: string, content: string): Promise<{ success: boolean; error?: string }> => {
    return ipcRenderer.invoke('write-file', path, content);
  },

  // App information
  getAppVersion: (): Promise<string> => {
    return ipcRenderer.invoke('get-app-version');
  },

  // Window controls
  minimizeWindow: (): void => {
    ipcRenderer.send('minimize-window');
  },

  maximizeWindow: (): void => {
    ipcRenderer.send('maximize-window');
  },

  closeWindow: (): void => {
    ipcRenderer.send('close-window');
  },

  // Environment detection
  isElectron: true
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI);

// TypeScript type definitions for the exposed API
export interface ElectronAPI {
  selectDirectory: () => Promise<string | null>;
  writeFile: (path: string, content: string) => Promise<{ success: boolean; error?: string }>;
  getAppVersion: () => Promise<string>;
  minimizeWindow: () => void;
  maximizeWindow: () => void;
  closeWindow: () => void;
  isElectron: boolean;
}

// Augment the global Window interface
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
