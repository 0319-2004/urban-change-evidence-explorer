import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  optimizeDeps: {
    exclude: ['maplibre-gl'],
  },
  test: {
    environment: 'node',
    include: ['tests/frontend/**/*.test.ts'],
    coverage: {
      reporter: ['text', 'html'],
    },
  },
});
