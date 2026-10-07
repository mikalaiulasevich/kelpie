import { ConfigurationImportErrorCode } from './configuration-import-types.js';

export const ConfigurationImportMessages = {
  Invalid: 'The configuration document is invalid.',
  Conflict: 'This funnel version already contains a different configuration.',
  SnapshotUnavailable: 'The configuration must contain stable JSON values.',
} as const;

export const ConfigurationImportFailureMessages = {
  [ConfigurationImportErrorCode.Invalid]: ConfigurationImportMessages.Invalid,
  [ConfigurationImportErrorCode.Conflict]: ConfigurationImportMessages.Conflict,
} as const satisfies ReadonlyDictionary<ConfigurationImportErrorCode, string>;
