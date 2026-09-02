const js = require('@eslint/js');
const tseslint = require('typescript-eslint');
const playwright = require('eslint-plugin-playwright');
const prettierConfig = require('eslint-config-prettier');

module.exports = tseslint.config(
  js.configs.recommended,
  {
    languageOptions: {
      globals: {
        require: 'readonly',
        module: 'readonly',
        process: 'readonly',
        __dirname: 'readonly',
      },
    },
  },
  {
    // CI maintenance scripts run under plain Node, outside the test framework —
    // console is their only output channel, so the src/ ban doesn't apply.
    files: ['scripts/**/*.mjs'],
    languageOptions: {
      globals: {
        console: 'readonly',
        process: 'readonly',
      },
    },
    rules: {
      'no-console': 'off',
    },
  },
  {
    // Type-aware TS rules (e.g. no-floating-promises) — scoped to .ts only so
    // eslint.config.js (plain CommonJS, not part of tsconfig) isn't affected.
    files: ['**/*.ts'],
    extends: [...tseslint.configs.recommendedTypeChecked],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    files: ['tests/**/*.ts', 'src/**/*.ts'],
    plugins: {
      playwright,
    },
    rules: {
      ...playwright.configs['flat/recommended'].rules,
      'playwright/no-wait-for-timeout': 'error',
      'playwright/no-conditional-in-test': 'error',
      'playwright/no-skipped-test': 'error',
    },
  },
  {
    files: ['src/**/*.ts'],
    rules: {
      'no-console': 'error',
    },
  },
  {
    files: ['tests/**/*.ts'],
    rules: {
      'no-console': 'warn',
    },
  },
  {
    // The one designated logging module — allowed to use console directly.
    files: ['src/utils/logger.ts'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    // Playwright's own expect.extend() matcher augmentation API requires
    // reopening its `namespace PlaywrightTest` (see node_modules/playwright/types/test.d.ts) —
    // there's no interface-only alternative.
    files: ['src/utils/matchers.util.ts'],
    rules: {
      '@typescript-eslint/no-namespace': 'off',
    },
  },
  prettierConfig,
  {
    ignores: ['node_modules/', 'test-results/', 'playwright-report/', 'blob-report/', 'dist/'],
  }
);
