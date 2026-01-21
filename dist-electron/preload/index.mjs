import { contextBridge, ipcRenderer } from "electron";
const electronAPI = {
  // File system operations for Obsidian export
  selectDirectory: () => {
    return ipcRenderer.invoke("select-directory");
  },
  writeFile: (path, content) => {
    return ipcRenderer.invoke("write-file", path, content);
  },
  // App information
  getAppVersion: () => {
    return ipcRenderer.invoke("get-app-version");
  },
  // Window controls
  minimizeWindow: () => {
    ipcRenderer.send("minimize-window");
  },
  maximizeWindow: () => {
    ipcRenderer.send("maximize-window");
  },
  closeWindow: () => {
    ipcRenderer.send("close-window");
  },
  // Environment detection
  isElectron: true
};
contextBridge.exposeInMainWorld("electronAPI", electronAPI);
