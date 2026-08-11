import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import federation from '@originjs/vite-plugin-federation';

/**
 * REMOTE — vite-plugin-federation config.
 *
 * This app is the "Analytics" micro-frontend.
 * It exposes its components so the Shell (host) can load them
 * at runtime from a separate deployment URL — no shell rebuild needed.
 *
 * In a real multi-repo setup this file lives in its own GitHub repo
 * and is deployed independently (e.g. to a CDN or separate Replit).
 */
export default defineConfig({
  plugins: [
    react(),
    federation({
      name: 'analyticsApp',

      // The file the shell fetches at runtime to discover exposed modules
      filename: 'remoteEntry.js',

      exposes: {
        // import('analyticsApp/AnalyticsDashboard')
        './AnalyticsDashboard': './src/components/AnalyticsDashboard',
        // import('analyticsApp/EventBus')
        './EventBus': './src/utils/eventBus',
      },

      shared: {
        react:       { singleton: true, requiredVersion: '^18' },
        'react-dom': { singleton: true, requiredVersion: '^18' },
      },
    }),
  ],

  build: {
    // Required for Vite Module Federation
    modulePreload: false,
    target: 'esnext',
    minify: false,
    cssCodeSplit: false,
  },

  preview: {
    port: 5001,
    host: '0.0.0.0',
    cors: true,   // allow shell at port 5000 to load remoteEntry.js
  },

  server: {
    port: 5001,
    host: '0.0.0.0',
    cors: true,
  },
});
