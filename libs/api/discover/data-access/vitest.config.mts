import { defineConfig } from 'vitest/config';

export default defineConfig(() => ({
  root: import.meta.dirname,
  cacheDir: '../../../../node_modules/.vite/libs/api/discover/data-access',
  resolve: {
    tsconfigPaths: true,
  },
  test: {
    name: 'api-discover-data-access',
    watch: false,
    globals: true,
    environment: 'node',
    include: ['{src,tests}/**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
    passWithNoTests: true,
    reporters: ['default'],
    coverage: {
      reportsDirectory: '../../../../coverage/libs/api/discover/data-access',
      provider: 'v8' as const,
    },
  },
}));
