import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { rmSync } from 'node:fs';
import { resolve } from 'node:path';

// Nunca publicar o arquivo de dados de teste (contém dados reais)
const semDadosLocais = () => ({
  name: 'sem-dados-locais',
  apply: 'build',
  closeBundle() { rmSync(resolve('dist/dados-local.json'), { force: true }); },
});

// base './' = funciona no GitHub Pages (subpasta) e em qualquer servidor
export default defineConfig({
  plugins: [react(), semDadosLocais()],
  base: './',
});
