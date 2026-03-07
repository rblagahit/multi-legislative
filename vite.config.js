import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

// Root is the project root — index.html here is the Vite entry point.
// Vite replaces %VITE_*% tokens in HTML (including inline scripts) at build time,
// so Firebase config values never appear in committed source.
//
// src/ holds React components for the Phase 3 migration. When that migration
// is complete, root index.html will import from src/main.jsx and the CDN-based
// inline script will be removed.

const generatedBuildDataPath = path.resolve(__dirname, '.generated', 'platform-build-data.json');

function injectBuildHeadMeta() {
  return {
    name: 'inject-build-head-meta',
    transformIndexHtml(html) {
      if (!fs.existsSync(generatedBuildDataPath)) return html;

      try {
        const buildData = JSON.parse(fs.readFileSync(generatedBuildDataPath, 'utf8'));
        const adsenseAccountId = String(buildData?.adsenseAccountId || '').trim();
        if (!adsenseAccountId) return html;

        const adsenseMeta = `<meta name="google-adsense-account" content="${adsenseAccountId}">`;
        if (html.includes('name="google-adsense-account"')) return html;
        return html.replace('</head>', `  ${adsenseMeta}\n</head>`);
      } catch (error) {
        console.warn('[inject-build-head-meta]', error);
        return html;
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), injectBuildHeadMeta()],
  build: {
    outDir:      path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined;
          if (id.includes('/firebase/storage/') || id.includes('/@firebase/storage')) return 'firebase-storage-vendor';
          if (id.includes('/firebase/') || id.includes('/@firebase/')) return 'firebase-vendor';
          if (id.includes('/react/') || id.includes('/react-dom/')) return 'react-vendor';
          return 'vendor';
        },
      },
    },
  },
});
