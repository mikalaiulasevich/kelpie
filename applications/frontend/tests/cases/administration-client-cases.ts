export const AdministrationClientCases = {
  SignInFailures: [
    {
      name: 'invalid credential input',
      status: 400,
      message: 'Enter a valid username and password.',
    },
    {
      name: 'incorrect credentials',
      status: 401,
      message: 'The username or password is incorrect.',
    },
    {
      name: 'rate limiting',
      status: 429,
      message: 'Too many attempts. Please wait before trying again.',
    },
    {
      name: 'unverified origin',
      status: 403,
      message: 'This request could not be verified. Please reload the page and try again.',
    },
    {
      name: 'server failure',
      status: 500,
      message: 'The administration service is unavailable. Please try again.',
    },
  ],
  SignOutFailures: [
    { name: 'server failure', status: 503, message: 'unavailable' },
    { name: 'unverified origin', status: 403, message: 'could not be verified' },
  ],
  InvalidIdentities: [
    { name: 'null', body: null },
    { name: 'missing username', body: { identifier: 'administrator-1' } },
    { name: 'invalid identifier', body: { identifier: 1, username: 'administrator' } },
  ],
} as const;
