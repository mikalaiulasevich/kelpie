export const DiagnosticCases = {
  ChangedHeaders: [
    { property: 'name', replacement: 'redacted' },
    { property: 'message', replacement: 'redacted' },
    { property: 'message', replacement: 'private input' },
  ],
  MultilineMessages: [
    'private input\n    at answer (/private/first-secret:123456:789)',
    'private input\n    at answer (/private/second-secret:123456:789)',
  ],
} as const;
