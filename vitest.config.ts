import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    coverage: { include: ['src/domain/**/*.ts'], exclude: ['**/*.test.ts', '**/test-fixture.ts'] },
  },
});
