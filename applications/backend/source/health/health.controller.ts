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
    } catch {
      // Database errors can include paths and queries; expose only availability.
    }

    throw new ServiceUnavailableException(TransportMessages.NotReady);
  }
}
