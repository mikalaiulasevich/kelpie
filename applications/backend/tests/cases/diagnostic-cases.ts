export const DiagnosticCases = {
  ChangedHeaderProperties: ['name', 'message'],
  EmptyHeaders: [
    { name: '', message: 'private message' },
    { name: 'Error', message: '' },
    { name: '', message: '' },
  ],
  MultilineMessages: [
    'private input\n    at answer (/private/first-secret:123456:789)',
    'private input\n    at answer (/private/second-secret:123456:789)',
  ],
} as const;
