import 'dotenv/config';
import { isError } from 'es-toolkit/predicate';
import { ErrorDiagnostics } from '../diagnostics/error-diagnostics.js';
import { ConfigurationImportCommand } from './configuration-import-command.js';
import { ConfigurationCommandPolicy } from './configuration-command-policy.js';
import { ConfigurationCommandMessages } from './configuration-command-messages.js';
import { ConfigurationImportError } from './configuration-import-error.js';

try {
  await ConfigurationImportCommand.run(
    process.argv.slice(ConfigurationCommandPolicy.ArgumentOffset),
  );
} catch (error) {
  const details =
    error instanceof ConfigurationImportError
      ? { code: error.code, issues: error.issues }
      : ErrorDiagnostics.describe(error);
  const reason = isError(error)
    ? Object.values(ConfigurationCommandMessages).find((message) => message === error.message)
    : undefined;
  console.error(
    JSON.stringify({ message: reason ?? ConfigurationCommandMessages.ImportFailed, details }),
  );
  process.exitCode = ConfigurationCommandPolicy.FailureExitCode;
}
