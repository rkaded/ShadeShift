import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  // Load .env so ANTHROPIC_API_KEY is available to the plugin
  const env = loadEnv(mode, process.cwd(), '');
  process.env.ANTHROPIC_API_KEY = env.ANTHROPIC_API_KEY;

  return {
    plugins: [
      react(),

      // Dev-server middleware that handles /api/advise without a separate process
      {
        name: 'api-advise',
        configureServer(server) {
          server.middlewares.use('/api/advise', async (req, res) => {
            const { handleAdvise } = await import('./api/advise.js');
            await handleAdvise(req, res);
          });
        },
      },
    ],

    resolve: { alias: {} },
    optimizeDeps: { include: ['geotiff'] },
  };
});
