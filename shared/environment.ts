/**
 * Environment Detection Utilities
 * 
 * Provides utilities to detect whether the app is running in:
 * - Electron desktop app
 * - Web browser
 * - Development mode
 * - Production mode
 */

/**
 * Check if the application is running inside Electron
 */
export function isElectron(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  
  return !!(window as any).electronAPI;
}

/**
 * Check if the application is running in a web browser
 */
export function isWeb(): boolean {
  return !isElectron();
}

/**
 * Check if running in development mode
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === 'development';
}

/**
 * Check if running in production mode
 */
export function isProduction(): boolean {
  return process.env.NODE_ENV === 'production';
}

/**
 * Get the appropriate server URL based on environment
 */
export function getServerUrl(): string {
  if (typeof window === 'undefined') {
    // Server-side
    return 'http://localhost:3000';
  }
  
  if (isElectron()) {
    // In Electron, always use localhost
    return 'http://localhost:3000';
  }
  
  // In web browser, use current origin
  return window.location.origin;
}

/**
 * Get the platform name
 */
export function getPlatform(): 'electron' | 'web' {
  return isElectron() ? 'electron' : 'web';
}

/**
 * Get environment information for debugging
 */
export function getEnvironmentInfo() {
  return {
    platform: getPlatform(),
    isElectron: isElectron(),
    isWeb: isWeb(),
    isDevelopment: isDevelopment(),
    isProduction: isProduction(),
    serverUrl: getServerUrl(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'N/A'
  };
}
