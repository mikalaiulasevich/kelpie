export const WarmupCases = {
  InvalidOrigins: [
    undefined,
    '',
    'http://example.com',
    'https://user:secret@example.com',
    'https://example.com/quiz',
    'https://example.com/?token=secret',
    'https://example.com/#secret',
  ],
  InvalidHealth: ['{"status":"healthy"}', 'x'.repeat(4097)],
};
