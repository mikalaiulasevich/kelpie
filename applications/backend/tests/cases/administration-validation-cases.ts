export const AdministrationValidationCases = {
  InvalidCredentials: [
    { name: 'missing username', value: { password: 'a-long-test-password' } },
    { name: 'missing password', value: { username: 'reviewer' } },
    { name: 'empty password', value: { username: 'reviewer', password: '' } },
    {
      name: 'unexpected property',
      value: { username: 'reviewer', password: 'secret', role: 'admin' },
    },
    { name: 'nonstring username', value: { username: 12, password: 'secret' } },
  ],
} as const;
