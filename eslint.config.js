import javascript from '@eslint/js';
import globals from 'globals';
import typescript from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

export default typescript.config(
  {
    ignores: [
      '**/dist/**',
      '**/distribution/**',
      '**/generated/**',
      '**/node_modules/**',
      '**/coverage/**',
    ],
  },
  javascript.configs.recommended,
  ...typescript.configs.recommended,
  {
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      'no-console': ['error', { allow: ['warn', 'error', 'info'] }],
      curly: ['error', 'all'],
      'no-nested-ternary': 'error',
      'no-param-reassign': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: 'ExportAllDeclaration',
          message: 'List public exports explicitly so ownership remains visible.',
        },
      ],
      'padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: '*', next: 'return' },
        { blankLine: 'always', prev: 'block-like', next: '*' },
      ],
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    files: ['applications/frontend/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['error', { allowConstantExport: true }],
    },
  },
);
