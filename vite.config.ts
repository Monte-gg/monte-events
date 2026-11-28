import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Uses relative './' assets so the exact same build works cleanly on BOTH
// GitHub Pages (/monte-events/) and inside the native Capacitor Android WebView.
const isCapacitorBuild = process.env.CAPACITOR_BUILD === 'true';

export default defineConfig({
  base: isCapacitorBuild ? './' : './',
  plugins: [react()],
  build: {
    outDir: 'docs',
  },
  server: {
    port: 5173,
    host: true,
  },
});
