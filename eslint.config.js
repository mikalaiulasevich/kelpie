import javascript from '@eslint/js';
import globals from 'globals';
import typescript from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';

/** @type {import('eslint').Rule.RuleModule} */
const objectMethodSpacing = {
  meta: {
    type: 'layout',
    fixable: 'whitespace',
    schema: [],
    messages: { missing: 'Separate domain object methods with a blank line.' },
  },
  create(context) {
    return {
      ObjectExpression(node) {
        const source = context.sourceCode;

        for (const [index, property] of node.properties.entries()) {
          const previous = node.properties[index - 1];

          if (
            property.type !== 'Property' ||
            !property.method ||
            previous?.type !== 'Property' ||
            !previous.method ||
            !previous.range ||
            !property.range
          ) {
            continue;
          }

          const between = source.text.slice(previous.range[1], property.range[0]);

          if (!/\n[\t \r]*\n/.test(between)) {
            const firstLineBreak = between.indexOf('\n');
            const separator = source.getTokenAfter(previous);
            const insertionOffset =
              firstLineBreak >= 0
                ? previous.range[1] + firstLineBreak + 1
                : (separator?.range?.[1] ?? previous.range[1]);
            const padding = firstLineBreak >= 0 ? '\n' : '\n\n';
            context.report({
              node: property,
              messageId: 'missing',
              fix: (fixer) =>
                fixer.insertTextAfterRange([insertionOffset, insertionOffset], padding),
            });
          }
        }
      },
    };
  },
};

const restrictedSyntax = [
  {
    selector:
      'BinaryExpression[operator="instanceof"][right.name="Error"]:not(CallExpression[callee.name="expect"] > BinaryExpression)',
    message:
      'Use es-toolkit isError for generic Error guards; preserve specific error subclass checks.',
  },
  {
    selector:
      'BinaryExpression[operator=/^(===|!==)$/][right.type="Identifier"][right.name="undefined"]:not(CallExpression[callee.name="expect"] > BinaryExpression)',
    message: 'Use es-toolkit isUndefined for guards; keep independent test expectations explicit.',
  },
  {
    selector:
      'BinaryExpression[operator=/^(===|!==)$/][right.raw="null"]:not(CallExpression[callee.name="expect"] > BinaryExpression)',
    message: 'Use es-toolkit isNull when the check must distinguish null from undefined.',
  },
  {
    selector:
      'BinaryExpression[operator=/^(===|!==)$/][left.type="UnaryExpression"][left.operator="typeof"][right.value="string"]:not(CallExpression[callee.name="expect"] > BinaryExpression)',
    message: 'Use es-toolkit isString for string guards.',
  },
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
      '**/.next/**',
      // Local browser evidence and disposable probes are not repository source.
      'test-results/**',
      'playwright-report/**',
    ],
  },
  javascript.configs.recommended,
  ...typescript.configs.recommended,
  {
    languageOptions: {
      globals: globals.node,
    },
    plugins: { kelpie: { rules: { 'object-method-spacing': objectMethodSpacing } } },
    rules: {
      'kelpie/object-method-spacing': 'error',
      'no-console': ['error', { allow: ['warn', 'error', 'info'] }],
      curly: ['error', 'all'],
      'lines-between-class-members': ['error', 'always'],
      'no-nested-ternary': 'error',
      'no-param-reassign': 'error',
      'no-restricted-syntax': ['error', ...restrictedSyntax, declarationRestrictions.helpers],
      'padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: '*', next: 'return' },
        {
          blankLine: 'always',
          prev: ['const', 'let'],
          next: ['if', 'for', 'while', 'switch', 'try'],
        },
        { blankLine: 'always', prev: 'block-like', next: '*' },
        { blankLine: 'always', prev: 'export', next: 'export' },
      ],
      '@typescript-eslint/no-non-null-assertion': 'error',
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-imports': 'error',
    },
  },
  {
    files: [
      'applications/*/source/**/*.{ts,tsx}',
      'applications/quiz/app/**/*.{ts,tsx}',
      'packages/*/source/**/*.ts',
    ],
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
    files: [
      'global-types.d.ts',
      'applications/*/source/ui-types.d.ts',
      'applications/quiz/ui-types.d.ts',
    ],
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
    files: ['applications/quiz/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'no-restricted-syntax': ['error', ...restrictedSyntax, declarationRestrictions.reactHelpers],
      ...reactHooks.configs.recommended.rules,
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
    files: [
      'applications/frontend/source/**/*.{ts,tsx}',
      'applications/quiz/source/**/*.{ts,tsx}',
      'applications/quiz/app/**/*.{ts,tsx}',
    ],
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
  {
    files: ['applications/backend/source/**/*.ts'],
    rules: { 'no-console': ['error', {}] },
  },
  {
    files: [
      'applications/*/source/**/*.{ts,tsx}',
      'applications/quiz/app/**/*.{ts,tsx}',
      'packages/*/source/**/*.ts',
    ],
    rules: {
      'lines-between-class-members': ['error', 'always'],
      'padding-line-between-statements': [
        'error',
        { blankLine: 'always', prev: '*', next: 'return' },
        {
          blankLine: 'always',
          prev: ['const', 'let'],
          next: ['if', 'for', 'while', 'switch', 'try'],
        },
        { blankLine: 'always', prev: 'block-like', next: '*' },
        { blankLine: 'always', prev: 'export', next: 'export' },
      ],
    },
  },
);
