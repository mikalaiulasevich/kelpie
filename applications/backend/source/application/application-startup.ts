import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { isNull } from 'es-toolkit/predicate';
import { attemptAsync } from 'es-toolkit/util';
import { Diagnostics } from '../diagnostics/diagnostics.js';
import { DiagnosticEvents, DiagnosticPhase } from '../diagnostics/diagnostic-policy.js';
import { ErrorDiagnostics } from '../diagnostics/error-diagnostics.js';
import { ApplicationEnvironmentService } from '../environment/application-environment.js';
import { ApplicationPolicy } from './application-policy.js';
import { ApplicationFactory } from './create-application.js';

const StartupFailures = {
  report(phase: ValueOf<typeof DiagnosticPhase>, error: unknown): void {
    Diagnostics.write({
      event: DiagnosticEvents.ApplicationFailed,
      phase,
      error: ErrorDiagnostics.describe(error),
    });
    process.exitCode = ApplicationPolicy.FailureExitCode;
  },

  async close(application: NestFastifyApplication): Promise<void> {
    try {
      await application.close();
    } catch (error) {
      Diagnostics.write({
        event: DiagnosticEvents.ApplicationCleanupFailed,
        phase: DiagnosticPhase.Cleanup,
        error: ErrorDiagnostics.describe(error),
      });
    }
  },
} as const;

const ApplicationListener = {
  async start(application: NestFastifyApplication): Promise<void> {
    try {
      const environment = application.get(ApplicationEnvironmentService).values;
      await application.listen(environment.port, environment.host);
      Diagnostics.write({ event: DiagnosticEvents.ApplicationStarted });
    } catch (error) {
      await StartupFailures.close(application);
      StartupFailures.report(DiagnosticPhase.Listen, error);
    }
  },
} as const;

export const ApplicationStartup = {
  async start(): Promise<void> {
    const [error, application] = await attemptAsync(() => ApplicationFactory.create());

    // The result distinguishes rejection even when the thrown value is null.
    if (isNull(application)) {
      StartupFailures.report(DiagnosticPhase.Creation, error);

      return;
    }

    await ApplicationListener.start(application);
  },
} as const;
