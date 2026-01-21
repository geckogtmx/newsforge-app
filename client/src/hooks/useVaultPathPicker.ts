/**
 * useVaultPathPicker Hook
 * 
 * Provides a native directory picker for selecting Obsidian vault path
 * Works in both Electron (native) and Web (manual input) modes
 */

import { useState } from 'react';
import { isElectron } from '@shared/environment';
import { selectDirectory } from '../lib/fileSystem';

export function useVaultPathPicker() {
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectedPath, setSelectedPath] = useState<string>('');

  /**
   * Open native directory picker (Electron) or return current path (Web)
   */
  const pickDirectory = async (): Promise<string | null> => {
    if (!isElectron()) {
      // In web mode, can't pick directory
      return null;
    }

    setIsSelecting(true);

    try {
      const directory = await selectDirectory();
      if (directory) {
        setSelectedPath(directory);
      }
      return directory;
    } catch (error) {
      console.error('Error selecting directory:', error);
      return null;
    } finally {
      setIsSelecting(false);
    }
  };

  /**
   * Manually set path (for web mode or manual input)
   */
  const setPath = (path: string) => {
    setSelectedPath(path);
  };

  /**
   * Clear selected path
   */
  const clearPath = () => {
    setSelectedPath('');
  };

  return {
    pickDirectory,
    setPath,
    clearPath,
    selectedPath,
    isSelecting,
    hasNativePicker: isElectron(),
  };
}
