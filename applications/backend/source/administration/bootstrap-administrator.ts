import 'dotenv/config';
import { Diagnostics } from '../diagnostics/diagnostics.js';
import { DiagnosticEvents } from '../diagnostics/diagnostic-policy.js';
import { ErrorDiagnostics } from '../diagnostics/error-diagnostics.js';
import { AdministrationBootstrapCommand } from './administration-bootstrap-command.js';
import { AdministrationCommandPolicy } from './administration-command-policy.js';
import { AdministrationBootstrapMessages } from './administration-bootstrap-messages.js';

try {
  await AdministrationBootstrapCommand.run();
} catch (error) {
  Diagnostics.write({
    event: DiagnosticEvents.AdministrationProvisionFailed,
    message: AdministrationBootstrapMessages.Failed,
    error: ErrorDiagnostics.describe(error),
  });
  process.exitCode = AdministrationCommandPolicy.FailureExitCode;
}
