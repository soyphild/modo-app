import { defineConfig, mergeConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import base from './vite.config';

// Demo autónoma (un solo HTML, sin servidor): VITE_DEMO=1 activa el motor local con bots.
export default mergeConfig(base, defineConfig({
  plugins: [viteSingleFile()],
  define: { 'import.meta.env.VITE_DEMO': JSON.stringify('1') },
  build: { outDir: '../dist-demo', emptyOutDir: true, assetsInlineLimit: 100_000_000 }
}));
