export const StartupFailureCases = [
  { name: 'null rejection', error: null, classification: 'unknown' },
  { name: 'undefined rejection', error: undefined, classification: 'unknown' },
  {
    name: 'Error rejection',
    error: new Error('private creation failure'),
    classification: 'error',
  },
] as const;
