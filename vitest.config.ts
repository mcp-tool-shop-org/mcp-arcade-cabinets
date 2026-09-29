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
    // ci.yml sets COVERAGE_LEG to 'true' on the one run whose reports go to
    // Codecov. V8 coverage slows the seeded simulations past the default 5 s
    // (the endless band's live test timed out there on the first run), so that
    // run allows 20 s; every other run keeps the default.
    ...(process.env.COVERAGE_LEG === 'true' ? { testTimeout: 20_000 } : {}),
  },
});
