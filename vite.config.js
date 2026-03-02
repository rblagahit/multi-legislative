import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// Root is the project root — index.html here is the Vite entry point.
// Vite replaces %VITE_*% tokens in HTML (including inline scripts) at build time,
// so Firebase config values never appear in committed source.
//
// src/ holds React components for the Phase 3 migration. When that migration
// is complete, root index.html will import from src/main.jsx and the CDN-based
// inline script will be removed.

export default defineConfig({
  plugins: [react()],
  build: {
    outDir:      path.resolve(__dirname, 'dist'),
    emptyOutDir: true,
  },
});
