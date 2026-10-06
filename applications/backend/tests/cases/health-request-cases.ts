export const HealthRequestCases = [
  {
    name: 'rejects oversized bodies without echoing input',
    body: JSON.stringify({ secret: 'x'.repeat(270_000) }),
    headers: {},
    expectedStatus: 413,
    expectedResponse: { statusCode: 413, message: 'Request body is too large.' },
  },
  {
    name: 'rejects malformed JSON without exposing submitted content',
    body: '{"secret":"private-value",',
    headers: {},
    expectedStatus: 400,
    expectedResponse: { statusCode: 400, message: 'Request could not be processed.' },
  },
  {
    name: 'rejects unsupported charsets as input errors',
    body: '{"secret":"private-value"}',
    headers: { 'content-type': 'application/json;charset=iso-8859-1' },
    expectedStatus: 415,
    expectedResponse: { statusCode: 415, message: 'Request could not be processed.' },
  },
  {
    name: 'rejects compressed requests before decompression',
    body: 'private-compressed-value',
    headers: { 'content-encoding': 'gzip' },
    expectedStatus: 415,
    expectedResponse: { statusCode: 415, message: 'Request could not be processed.' },
  },
] as const;
