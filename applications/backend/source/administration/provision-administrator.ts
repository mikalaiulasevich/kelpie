import 'dotenv/config';
import { Diagnostics } from '../diagnostics/diagnostics.js';
import { DiagnosticEvents } from '../diagnostics/diagnostic-policy.js';
import { ErrorDiagnostics } from '../diagnostics/error-diagnostics.js';
import { AdministrationProvisionCommand } from './administration-provision-command.js';
import { AdministrationCommandPolicy } from './administration-command-policy.js';
import { AdministrationCommandMessages } from './administration-command-messages.js';

try {
  await AdministrationProvisionCommand.run();
} catch (error) {
  Diagnostics.write({
    event: DiagnosticEvents.AdministrationProvisionFailed,
    message: AdministrationCommandMessages.ProvisionFailed,
    error: ErrorDiagnostics.describe(error),
  });
  process.exitCode = AdministrationCommandPolicy.FailureExitCode;
}
