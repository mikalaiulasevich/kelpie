import type { Prisma } from '../../generated/prisma/client.js';

export const ConfigurationImportPolicy = {
  HashAlgorithm: 'sha256',
  HashEncoding: 'hex',
  UniqueConstraintCode: 'P2002',
  RootPath: '/',
  VersionSelection: {
    identifier: true,
    funnelIdentifier: true,
    version: true,
    schemaVersion: true,
    checksum: true,
  } satisfies Prisma.FunnelVersionSelect,
} as const;
