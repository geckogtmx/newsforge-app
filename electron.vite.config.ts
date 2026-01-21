import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { jsxLocPlugin } from '@builder.io/vite-plugin-jsx-loc';
import path from 'path';

export default defineConfig({
  // Main process configuration
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'dist-electron/main',
      rollupOptions: {
        input: {
          index: path.resolve(__dirname, 'electron/main.ts')
        }
      }
    }
  },

  // Preload script configuration
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      outDir: 'dist-electron/preload',
      rollupOptions: {
        input: {
          index: path.resolve(__dirname, 'electron/preload.ts')
        }
      }
    }
  },

  // Renderer process configuration (React app)
  renderer: {
    plugins: [react(), tailwindcss(), jsxLocPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'client/src'),
        '@shared': path.resolve(__dirname, 'shared'),
        '@assets': path.resolve(__dirname, 'attached_assets')
      }
    },
    root: path.resolve(__dirname, 'client'),
    publicDir: path.resolve(__dirname, 'client/public'),
    build: {
      outDir: path.resolve(__dirname, 'dist-electron/renderer'),
      emptyOutDir: true,
      rollupOptions: {
        input: path.resolve(__dirname, 'client/index.html')
      }
    },
    server: {
      port: 5173,
      strictPort: false
    }
  }
});
