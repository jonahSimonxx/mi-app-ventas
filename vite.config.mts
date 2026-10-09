import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

const raiz = import.meta.dirname;

export default defineConfig({
  plugins: [react()],
  root: path.resolve(raiz, 'src/renderer'),
  base: './',
  build: {
    outDir: path.resolve(raiz, 'dist/renderer'),
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    strictPort: true,
  },
});
