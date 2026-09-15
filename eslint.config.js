import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      '**/.venv/**',
      'fixtures/**',
      'film/**',
      'site/**',
      '.swarm/',
      '.swarm/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  // The root's scripts and each package's own (packages/launcher/scripts).
  { files: ['**/scripts/**/*.mjs'], languageOptions: { globals: globals.node } },
  { files: ['apps/**/*.ts'], languageOptions: { globals: globals.browser } },
  { rules: { '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }] } },
);
