import javascript from '@eslint/js';
import globals from 'globals';
import typescript from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

const restrictedSyntax = [
  {
    selector: 'ExportAllDeclaration',
    message: 'List public exports explicitly so ownership remains visible.',
  },
  {
    selector:
      'ExportNamedDeclaration > VariableDeclaration > VariableDeclarator[init.type="MemberExpression"]',
    message: 'Export the owning object instead of creating a separate member alias.',
  },
  {
    selector:
      'ExportNamedDeclaration > VariableDeclaration > VariableDeclarator[id.type="ObjectPattern"]',
    message: 'Export the owning object instead of destructuring its members into exports.',
  },
];

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
        ...restrictedSyntax,
        {
          selector: 'FunctionDeclaration',
          message: 'Put helper operations in their owning const object or class.',
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
    files: ['global-types.d.ts', 'applications/frontend/source/ui-types.d.ts'],
    rules: {
      // Ambient declarations are consumed by other files through TypeScript's program scope.
      '@typescript-eslint/no-unused-vars': 'off',
    },
  },
  {
    files: ['applications/frontend/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      'no-restricted-syntax': [
        'error',
        ...restrictedSyntax,
        {
          selector: 'FunctionDeclaration:not([id.name=/^[A-Z]/]):not([id.name=/^use[A-Z]/])',
          message:
            'Put helpers in domain objects; standalone declarations are reserved for React components and hooks.',
        },
      ],
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['error', { allowConstantExport: true }],
    },
  },
);
