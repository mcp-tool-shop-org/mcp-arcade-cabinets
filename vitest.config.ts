import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // The root runners under scripts/ are plain node modules with no package
    // of their own, so their tests live beside them.
    include: [
      'packages/*/test/**/*.test.ts',
      'apps/*/test/**/*.test.ts',
      'scripts/test/**/*.test.mjs',
    ],
    passWithNoTests: false,
  },
});
