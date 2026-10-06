import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import { TransportMessages } from '../transport/transport-messages.js';
import { DatabaseService } from '../database/database.service.js';

const HealthStatus = { Healthy: 'healthy', Ready: 'ready' } as const;

interface HealthResponse {
  readonly status: ValueOf<typeof HealthStatus>;
}

@Controller('health')
export class HealthController {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  @Get('live')
  live(): HealthResponse {
    return { status: HealthStatus.Healthy };
  }

  @Get('ready')
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
