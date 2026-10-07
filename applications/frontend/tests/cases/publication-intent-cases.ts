export const PublicationIntentCases = {
  InvalidSaved: [
    { name: 'corrupt JSON', serialized: '{' },
    { name: 'missing command', serialized: '{"kind":"publish","label":"Version 3"}' },
    {
      name: 'rollback with publish target',
      serialized:
        '{"kind":"rollback","label":"Previous","command":{"operationIdentifier":"12345678-1234-1234-1234-123456789012","funnelIdentifier":"workstyle-planner","expectedRevision":2,"targetVersionIdentifier":"22345678-1234-1234-1234-123456789012"}}',
    },
    {
      name: 'publish without target',
      serialized:
        '{"kind":"publish","label":"Version 3","command":{"operationIdentifier":"12345678-1234-1234-1234-123456789012","funnelIdentifier":"workstyle-planner","expectedRevision":2}}',
    },
    { name: 'unknown kind', serialized: '{"kind":"delete","command":{},"label":"Unknown"}' },
    {
      name: 'invalid operation identifier',
      serialized:
        '{"kind":"rollback","label":"Previous","command":{"operationIdentifier":"invalid","funnelIdentifier":"workstyle-planner","expectedRevision":2}}',
    },
  ],
} as const;
