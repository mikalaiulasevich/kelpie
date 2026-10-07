import { isError } from 'es-toolkit/predicate';
import { attempt } from 'es-toolkit/util';
import { Diagnostics } from '../diagnostics/diagnostics.js';
import { DiagnosticEvents } from '../diagnostics/diagnostic-policy.js';
import { ErrorDiagnostics } from '../diagnostics/error-diagnostics.js';
import { ConfigurationCommandMessages } from './configuration-command-messages.js';
import type {
  ConfigurationCommandFailure,
  ConfigurationCommandFailureDetails,
} from './configuration-command-types.js';
import { ConfigurationImportError } from './configuration-import-error.js';

const CommandFailureDetails = {
  describe(error: unknown): ConfigurationCommandFailureDetails {
    const [, details] = attempt(() => {
      if (error instanceof ConfigurationImportError) {
        return { code: error.code, issues: error.issues };
      }

      return ErrorDiagnostics.describe(error);
    });

    return details ?? ErrorDiagnostics.describe(error);
  },

  message(error: unknown): string {
    const [, message] = attempt(() => {
      if (!isError(error)) {
        return undefined;
      }

      const errorMessage = error.message;

      return Object.values(ConfigurationCommandMessages).find((known) => known === errorMessage);
    });

    return message ?? ConfigurationCommandMessages.ImportFailed;
  },
} as const;

export const ConfigurationCommandDiagnostics = {
  describe(error: unknown): ConfigurationCommandFailure {
    return {
      message: CommandFailureDetails.message(error),
      details: CommandFailureDetails.describe(error),
    };
  },

  report(error: unknown): void {
    Diagnostics.write({
      event: DiagnosticEvents.ConfigurationImportFailed,
      ...ConfigurationCommandDiagnostics.describe(error),
    });
  },
} as const;
