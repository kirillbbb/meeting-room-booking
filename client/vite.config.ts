import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';

const apiProxy = (target: string) => ({
  '/api': { target, ws: true },
});

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: apiProxy('http://127.0.0.1:3000'),
  },
  preview: {
    port: 4173,
    strictPort: true,
    proxy: apiProxy('http://127.0.0.1:3100'),
  },
  test: {
    include: ['src/**/*.test.{ts,tsx}'],
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    css: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      reportsDirectory: './coverage',
      thresholds: {
        statements: 50,
        branches: 65,
        functions: 55,
        lines: 50,
      },
    },
  },
});
