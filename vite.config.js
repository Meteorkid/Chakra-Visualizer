import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import basicSsl from '@vitejs/plugin-basic-ssl';

// HTTPS is required locally for webcam access (getUserMedia).
// Run: npm install -D @vitejs/plugin-basic-ssl
// Then open https://localhost:5173 (not http://) and accept the cert warning.
export default defineConfig({
  plugins: [
    react(),
    basicSsl(),
  ],
  server: {
    https: true,
    port: 5173,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    css: true,
  },
});
