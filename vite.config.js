import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  // geotiff uses Node built-ins; alias them away in the browser bundle
  resolve: {
    alias: {
      // geotiff v2 ships an ESM browser build; point at it explicitly
    }
  },
  optimizeDeps: {
    include: ['geotiff']
  }
});
