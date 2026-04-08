import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.ts',

    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: [
        'src/**/*.test.{ts,tsx}',
        'src/test/**',
        'src/hooks/**',
        'src/main.tsx',
        'src/vite-env.d.ts',
        'src/types/**',
      ],
      reporter: ['text', 'lcov'],
      reportsDirectory: './coverage',
    },
  },
});
