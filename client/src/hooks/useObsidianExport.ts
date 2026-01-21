/**
 * useObsidianExport Hook
 * 
 * Provides Obsidian export functionality with:
 * - Native directory picker in Electron
 * - Fallback to configured path in web mode
 * - Integration with existing tRPC export procedures
 */

import { useState } from 'react';
import { isElectron } from '@shared/environment';
import { selectDirectory } from '../lib/fileSystem';
import { trpc } from '@/lib/trpc';

export interface UseObsidianExportOptions {
  onSuccess?: (result: { filePath?: string; totalExported?: number }) => void;
  onError?: (error: string) => void;
}

export function useObsidianExport(options?: UseObsidianExportOptions) {
  const [isExporting, setIsExporting] = useState(false);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);

  const utils = trpc.useUtils();

  /**
   * Select Obsidian vault directory (Electron only)
   * In web mode, this returns null and uses the configured path
   */
  const selectVaultDirectory = async (): Promise<string | null> => {
    if (!isElectron()) {
      console.log('Directory selection only available in desktop mode');
      return null;
    }

    try {
      const directory = await selectDirectory();
      if (directory) {
        setSelectedPath(directory);
      }
      return directory;
    } catch (error) {
      console.error('Error selecting directory:', error);
      options?.onError?.('Failed to select directory');
      return null;
    }
  };

  /**
   * Export a single content package
   */
  const exportPackage = async (packageId: string) => {
    setIsExporting(true);

    try {
      // In Electron, optionally let user select directory first
      if (isElectron() && !selectedPath) {
        const directory = await selectVaultDirectory();
        if (!directory) {
          // User cancelled or error occurred
          setIsExporting(false);
          return;
        }
        // Note: We would need to update the settings with this path
        // For now, we'll use the existing configured path
      }

      // Call the existing tRPC procedure
      const result = await utils.client.export.exportPackage.mutate({ packageId });

      options?.onSuccess?.(result);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Export failed';
      options?.onError?.(message);
      throw error;
    } finally {
      setIsExporting(false);
    }
  };

  /**
   * Export all packages for a run
   */
  const exportRun = async (runId: string) => {
    setIsExporting(true);

    try {
      // In Electron, optionally let user select directory first
      if (isElectron() && !selectedPath) {
        const directory = await selectVaultDirectory();
        if (!directory) {
          // User cancelled or error occurred
          setIsExporting(false);
          return;
        }
      }

      // Call the existing tRPC procedure
      const result = await utils.client.export.exportRun.mutate({ runId });

      options?.onSuccess?.(result);
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Export failed';
      options?.onError?.(message);
      throw error;
    } finally {
      setIsExporting(false);
    }
  };

  /**
   * Check if native directory picker is available
   */
  const hasNativePicker = isElectron();

  return {
    exportPackage,
    exportRun,
    selectVaultDirectory,
    isExporting,
    selectedPath,
    hasNativePicker,
  };
}
