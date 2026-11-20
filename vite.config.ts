import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';

export default defineConfig(({ mode }) => {
  // Vista previa en un solo HTML (modo demostración), para revisar el diseño sin servidor.
  if (mode === 'single') {
    return {
      plugins: [react(), viteSingleFile()],
      base: './',
      publicDir: false,
      assetsInclude: ['**/*.xlsx'],
      envPrefix: 'NO_ENV_IN_PREVIEW_',
      build: { outDir: 'dist-preview', rollupOptions: { input: 'preview.html' }, assetsInlineLimit: 100_000_000 },
    };
  }
  return {
    // Ruta donde se publica: "/" en un subdominio (menu.ochentos.com) o "/menu-digital/".
    base: process.env.VITE_BASE_PATH || '/',
    plugins: [react()],
    build: {
      rollupOptions: { input: { main: 'index.html', admin: 'admin/index.html' } },
    },
    test: { environment: 'node' },
  };
});
