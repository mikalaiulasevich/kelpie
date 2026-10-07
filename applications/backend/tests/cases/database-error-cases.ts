export const DatabaseErrorCases = {
  NonTransient: [
    { name: 'unique constraint', code: 'P2002' },
    { name: 'foreign key constraint', code: 'P2003' },
    { name: 'unknown error', code: 'P9999' },
  ],
} as const;
