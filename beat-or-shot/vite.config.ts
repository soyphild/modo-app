import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import path from 'node:path';

export default defineConfig({
  root: 'client',
  plugins: [react()],
  css: { postcss: { plugins: [tailwind({ config: path.resolve(__dirname, 'tailwind.config.js') }), autoprefixer()] } },
  server: {
    host: true,
    port: 5173,
    fs: { allow: ['..'] },
    proxy: {
      '/socket.io': { target: 'http://localhost:3000', ws: true },
      '/api': 'http://localhost:3000'
    }
  },
  build: { outDir: '../dist', emptyOutDir: true }
});
