import { Controller, Get, Inject, ServiceUnavailableException } from '@nestjs/common';
import { TransportMessages } from '../transport/transport-messages.js';
import { DatabaseService } from '../database/database.service.js';

interface HealthResponse {
  readonly status: 'healthy' | 'ready';
}

@Controller('health')
export class HealthController {
  constructor(@Inject(DatabaseService) private readonly database: DatabaseService) {}

  @Get('live')
  live(): HealthResponse {
    return { status: 'healthy' };
  }

  @Get('ready')
  async ready(): Promise<HealthResponse> {
    try {
      if (await this.database.checkReadiness()) {
        return { status: 'ready' };
      }
    } catch {
      // Database errors can include paths and queries; expose only availability.
    }

    throw new ServiceUnavailableException(TransportMessages.NotReady);
  }
}
