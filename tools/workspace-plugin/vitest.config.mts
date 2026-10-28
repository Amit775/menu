import { defineConfig } from 'vitest/config';

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../node_modules/.vite/tools/workspace-plugin',
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    name: 'workspace-plugin',
    watch: false,
    globals: true,
    environment: 'jsdom',
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    // Generator specs run the real Angular and Nest library generators, which
    // take seconds each when other targets share the CPU.
    testTimeout: 20_000,
    hookTimeout: 20_000,
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../coverage/tools/workspace-plugin',
      provider: 'v8' as const,
    },
  },
}));
