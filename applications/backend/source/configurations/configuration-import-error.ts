import type { ConfigurationIssue } from '@kelpie/contracts';
import { ConfigurationImportErrorCode } from './configuration-import-types.js';
import { ConfigurationImportMessages } from './configuration-import-messages.js';

export class ConfigurationImportError extends Error {
  constructor(
    readonly code: ConfigurationImportErrorCode,
    readonly issues: ReadonlyList<ConfigurationIssue> = [],
  ) {
    super(
      code === ConfigurationImportErrorCode.Invalid
        ? ConfigurationImportMessages.Invalid
        : ConfigurationImportMessages.Conflict,
    );
    this.name = 'ConfigurationImportError';
  }
}
