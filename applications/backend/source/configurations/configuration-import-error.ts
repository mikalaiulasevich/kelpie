import type { ConfigurationIssue } from '@kelpie/contracts';
import type { ConfigurationImportErrorCode } from './configuration-import-types.js';
import { ConfigurationImportFailureMessages } from './configuration-import-messages.js';

export class ConfigurationImportError extends Error {
  constructor(
    readonly code: ConfigurationImportErrorCode,
    readonly issues: ReadonlyList<ConfigurationIssue> = [],
  ) {
    super(ConfigurationImportFailureMessages[code]);

    this.name = 'ConfigurationImportError';
  }
}
