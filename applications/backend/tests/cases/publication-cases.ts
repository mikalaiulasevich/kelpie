export const PublicationCases = {
  CorruptedVersions: [
    { name: 'document', data: { document: {} } },
    { name: 'checksum', data: { checksum: 'corrupted-checksum' } },
    { name: 'version metadata', data: { version: 99 } },
    { name: 'schema metadata', data: { schemaVersion: 'unsupported' } },
  ],
  SuppliedVersions: [1, 2, 3],
  ProtectedRoutes: [
    { method: 'GET', route: 'configurations?funnelIdentifier=test' },
    { method: 'POST', route: 'configurations' },
    { method: 'GET', route: 'publications?funnelIdentifier=test' },
    { method: 'POST', route: 'publications' },
    { method: 'POST', route: 'rollbacks' },
  ],
  InvalidPublications: [
    { name: 'noninteger revision', properties: { expectedRevision: 0.5 } },
    { name: 'negative revision', properties: { expectedRevision: -1 } },
    { name: 'non UUID operation', properties: { operationIdentifier: 'invalid' } },
    { name: 'injected administrator', properties: { administratorIdentifier: 'unexpected' } },
  ],
} as const;
