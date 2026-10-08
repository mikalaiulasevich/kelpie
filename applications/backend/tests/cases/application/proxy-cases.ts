export const ProxyCases = [
  { name: 'ignores forwarded addresses by default', enabled: 'false', expectedStatus: 429 },
  {
    name: 'separates visitors behind a trusted loopback gateway',
    enabled: 'true',
    expectedStatus: 401,
  },
] as const;
