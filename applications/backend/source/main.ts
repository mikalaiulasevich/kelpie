import 'dotenv/config';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { ApplicationPolicy } from './application/application-policy.js';
import { Diagnostics } from './diagnostics/diagnostics.js';
import { DiagnosticEvents, DiagnosticPhase } from './diagnostics/diagnostic-policy.js';
import { ErrorDiagnostics } from './diagnostics/error-diagnostics.js';
import { ApplicationFactory } from './application/create-application.js';
import { ApplicationEnvironmentService } from './environment/application-environment.js';

let application: Optional<NestExpressApplication>;
let phase: ValueOf<typeof DiagnosticPhase> = DiagnosticPhase.Creation;

try {
  application = await ApplicationFactory.create();
  const environment = application.get(ApplicationEnvironmentService).values;
  phase = DiagnosticPhase.Listen;
  await application.listen(environment.port, environment.host);
  Diagnostics.write({ event: DiagnosticEvents.ApplicationStarted });
} catch (error) {
  try {
    await application?.close();
  } catch (cleanupError) {
    Diagnostics.write({
      event: DiagnosticEvents.ApplicationCleanupFailed,
      phase: DiagnosticPhase.Cleanup,
      error: ErrorDiagnostics.describe(cleanupError),
    });
  }

  Diagnostics.write({
    event: DiagnosticEvents.ApplicationFailed,
    phase,
    error: ErrorDiagnostics.describe(error),
  });
  process.exitCode = ApplicationPolicy.FailureExitCode;
}
