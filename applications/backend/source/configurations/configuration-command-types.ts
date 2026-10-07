import type { ErrorDescription } from '../diagnostics/diagnostics-types.js';
import type { ConfigurationImportError } from './configuration-import-error.js';

export type ConfigurationCommandFailureDetails =
  Pick<ConfigurationImportError, 'code' | 'issues'> | ErrorDescription;

export interface ConfigurationCommandFailure {
  readonly message: string;
  readonly details: ConfigurationCommandFailureDetails;
}
