// Gera um único HTML (dist-arquivo/index.html) para abrir sem servidor.
// Os dados são embutidos depois por scripts/embutir_dados.py.
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig({
  plugins: [react(), viteSingleFile()],
  base: './',
  define: { 'import.meta.env.VITE_FONTE': JSON.stringify('local') },
  build: { outDir: 'dist-arquivo' },
});
