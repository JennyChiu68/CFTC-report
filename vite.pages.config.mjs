import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  root: fileURLToPath(new URL('./github-preview/', import.meta.url)),
  base: '/CFTC-report/',
  publicDir: fileURLToPath(new URL('./public/', import.meta.url)),
  build: {
    outDir: fileURLToPath(new URL('./.pages-dist/', import.meta.url)),
    emptyOutDir: true,
  },
});
