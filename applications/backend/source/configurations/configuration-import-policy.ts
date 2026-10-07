import { HttpStatus } from '@nestjs/common';
import { ConfigurationImportErrorCode } from './configuration-import-types.js';
import type { Prisma } from '../../generated/prisma/client.js';

export const ConfigurationImportPolicy = {
  HashAlgorithm: 'sha256',
  HashEncoding: 'hex',
  RootPath: '/',
  ManagementRoute: 'administration/configurations',
  IdentityFields: ['funnelIdentifier', 'version', 'schemaVersion', 'checksum'],
  VersionSelection: {
    identifier: true,
    funnelIdentifier: true,
    version: true,
    schemaVersion: true,
    checksum: true,
  } satisfies Prisma.FunnelVersionSelect,
} as const;

export const ConfigurationImportHttpStatus = {
  [ConfigurationImportErrorCode.Invalid]: HttpStatus.UNPROCESSABLE_ENTITY,
  [ConfigurationImportErrorCode.Conflict]: HttpStatus.CONFLICT,
} as const satisfies ReadonlyDictionary<ConfigurationImportErrorCode, HttpStatus>;
