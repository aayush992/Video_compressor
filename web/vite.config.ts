import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'build',   // Vercel default is "build" for React apps
  },
  server: {
    port: 3000,
  },
});
