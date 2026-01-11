import baseConfig from './index.js';

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...baseConfig,
  {
    files: ['**/*.ts'],
    rules: {
      'no-console': 'off', // Allow console in Node.js services
      '@typescript-eslint/no-require-imports': 'error',
    },
  },
];
