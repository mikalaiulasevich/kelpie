import javascript from '@eslint/js';
import globals from 'globals';
import typescript from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

const restrictedSyntax = [
  {
    selector: 'TSUnionType:has(> TSStringKeyword):has(> TSNumberKeyword)',
    message:
      'Use the shared TextOrNumber alias or an existing domain type instead of repeating primitive unions.',
  },
  {
    selector:
      'CallExpression[callee.type="MemberExpression"][callee.property.name="each"] > ArrayExpression.arguments',
    message: 'Move scenario tables into the owning tests/cases catalog.',
  },
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

const inlineErrorRestrictions = [
  {
    selector:
      'NewExpression[callee.name=/^(Error|TypeError|RangeError|AggregateError)$/] > Literal.arguments',
    message: 'Keep authored error text in a domain-owned message catalog.',
  },
  {
    selector:
      'NewExpression[callee.name=/^(Error|TypeError|RangeError|AggregateError)$/] > TemplateLiteral.arguments',
    message: 'Format authored error text through a domain-owned message catalog.',
  },
];

const declarationRestrictions = {
  helpers: {
    selector: 'FunctionDeclaration',
    message: 'Put helper operations in their owning const object or class.',
  },
  reactHelpers: {
    selector: 'FunctionDeclaration:not([id.name=/^[A-Z]/]):not([id.name=/^use[A-Z]/])',
    message:
      'Put helpers in domain objects; standalone declarations are reserved for React components and hooks.',
  },
};

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
      'no-restricted-syntax': ['error', ...restrictedSyntax, declarationRestrictions.helpers],
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
    files: ['applications/*/source/**/*.{ts,tsx}', 'packages/*/source/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [{ name: 'vitest', message: 'Keep test code and Vitest imports inside tests/.' }],
          patterns: [
            {
              group: ['**/tests/**'],
              message: 'Production source must not depend on test support.',
            },
          ],
        },
      ],
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
      'no-restricted-syntax': ['error', ...restrictedSyntax, declarationRestrictions.reactHelpers],
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['error', { allowConstantExport: true }],
    },
  },
  {
    files: ['applications/*/source/**/*.{ts,tsx}', 'packages/*/source/**/*.ts', 'scripts/**/*.mjs'],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...restrictedSyntax,
        ...inlineErrorRestrictions,
        declarationRestrictions.helpers,
      ],
    },
  },
  {
    files: ['applications/frontend/source/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...restrictedSyntax,
        ...inlineErrorRestrictions,
        declarationRestrictions.reactHelpers,
      ],
    },
  },
  {
    files: ['**/*-policy.ts', '**/*-policy.mjs'],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...restrictedSyntax,
        ...inlineErrorRestrictions,
        declarationRestrictions.helpers,
        {
          selector: 'VariableDeclarator[id.name=/Messages$/]',
          message: 'Keep message catalogs separate from static policy modules.',
        },
      ],
    },
  },
);
