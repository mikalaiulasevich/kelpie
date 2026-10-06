export const HealthRequestCases = [
  {
    name: 'rejects oversized bodies without echoing input',
    body: JSON.stringify({ secret: 'x'.repeat(270_000) }),
    expectedStatus: 413,
    expectedResponse: { statusCode: 413, message: 'Request body is too large.' },
  },
  {
    name: 'rejects malformed JSON without exposing submitted content',
    body: '{"secret":"private-value",',
    expectedStatus: 400,
    expectedResponse: { statusCode: 400, message: 'Request could not be processed.' },
  },
] as const;
