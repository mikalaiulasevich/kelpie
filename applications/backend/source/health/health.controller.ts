import { Diagnostics } from '../diagnostics/diagnostics.js';
import { DiagnosticEvents } from '../diagnostics/diagnostic-policy.js';
import { ErrorDiagnostics } from '../diagnostics/error-diagnostics.js';
import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import { TransportMessages } from '../transport/transport-messages.js';
import { DatabaseService } from '../database/database.service.js';
import { HealthRoutes, HealthStatus } from './health-policy.js';

interface HealthResponse {
  readonly status: ValueOf<typeof HealthStatus>;
}

@Controller(HealthRoutes.Controller)
export class HealthController {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  @Get(HealthRoutes.Liveness)
  live(): HealthResponse {
    return { status: HealthStatus.Healthy };
  }

  @Get(HealthRoutes.Readiness)
  async ready(): Promise<HealthResponse> {
    try {
      if (await this.database.checkReadiness()) {
        return { status: HealthStatus.Ready };
      }
    } catch (error) {
      Diagnostics.write({
        event: DiagnosticEvents.ReadinessFailed,
        reason: 'database_query_failed',
        error: ErrorDiagnostics.describe(error),
      });
      throw new ServiceUnavailableException(TransportMessages.NotReady);
    }

    Diagnostics.write({ event: DiagnosticEvents.ReadinessFailed, reason: 'migrations_incomplete' });
    throw new ServiceUnavailableException(TransportMessages.NotReady);
  }
}
