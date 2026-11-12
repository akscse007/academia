import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { copyFileSync } from 'node:fs';
import { resolve } from 'node:path';

// Copy dist/index.html → dist/404.html after build.
// Render + most static hosts serve 404.html for any unknown route, which
// lets the inline redirect script in index.html bounce legacy URLs
// (e.g. /platform/academies) to the HashRouter form (/#/platform/academies).
function spaFallback() {
  return {
    name: 'spa-404-fallback',
    closeBundle() {
      const dist = resolve(__dirname, 'dist');
      try {
        copyFileSync(resolve(dist, 'index.html'), resolve(dist, '404.html'));
        // eslint-disable-next-line no-console
        console.log('✓ dist/404.html created (copy of index.html)');
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn('Could not create 404.html:', e.message);
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), spaFallback()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5000',
      '/uploads': 'http://localhost:5000',
    },
  },
});
