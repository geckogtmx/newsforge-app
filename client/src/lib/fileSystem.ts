/**
 * File System Utilities
 * 
 * Provides cross-platform file system operations that work in both:
 * - Electron (using native file dialogs)
 * - Web browser (using download fallbacks)
 */

import { isElectron } from '@shared/environment';

/**
 * Select a directory using native dialog (Electron) or return null (Web)
 */
export async function selectDirectory(): Promise<string | null> {
  if (isElectron() && window.electronAPI) {
    return await window.electronAPI.selectDirectory();
  }
  
  // In web mode, we can't select directories
  console.warn('Directory selection is only available in desktop mode');
  return null;
}

/**
 * Write a file to the file system
 * - In Electron: Uses native file system
 * - In Web: Downloads the file
 */
export async function writeFile(
  filePath: string,
  content: string,
  fileName?: string
): Promise<{ success: boolean; error?: string }> {
  if (isElectron() && window.electronAPI) {
    // Use native file system in Electron
    return await window.electronAPI.writeFile(filePath, content);
  }
  
  // Fallback: Download file in web browser
  try {
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || filePath.split('/').pop() || 'download.md';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Export content to a file
 * - In Electron: Opens directory picker, then writes file
 * - In Web: Downloads the file directly
 */
export async function exportFile(
  content: string,
  defaultFileName: string
): Promise<{ success: boolean; path?: string; error?: string }> {
  if (isElectron() && window.electronAPI) {
    // Electron: Let user select directory
    const directory = await selectDirectory();
    
    if (!directory) {
      return { success: false, error: 'No directory selected' };
    }
    
    const filePath = `${directory}/${defaultFileName}`;
    const result = await writeFile(filePath, content);
    
    if (result.success) {
      return { success: true, path: filePath };
    } else {
      return { success: false, error: result.error };
    }
  } else {
    // Web: Download directly
    const result = await writeFile('', content, defaultFileName);
    return {
      success: result.success,
      path: result.success ? `Downloads/${defaultFileName}` : undefined,
      error: result.error
    };
  }
}

/**
 * Get app version (Electron only)
 */
export async function getAppVersion(): Promise<string | null> {
  if (isElectron() && window.electronAPI) {
    return await window.electronAPI.getAppVersion();
  }
  return null;
}

/**
 * Check if native file system access is available
 */
export function hasNativeFileSystemAccess(): boolean {
  return isElectron() && !!window.electronAPI;
}
