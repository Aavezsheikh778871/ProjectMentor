import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// The API server runs on :5000; proxy /api during dev so the client can use
// same-origin relative URLs and we sidestep CORS entirely in development.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
});
