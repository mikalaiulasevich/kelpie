import { Module, type DynamicModule } from '@nestjs/common';

import { ApplicationShutdown } from './application-shutdown.js';
import { DatabaseService } from '../database/database.service.js';
import { ApplicationEnvironmentService } from '../environment/application-environment.js';
import { EnvironmentInjection } from '../environment/environment-policy.js';
import type { ApplicationEnvironment } from '../environment/environment-schemas.js';
import { ConfigurationImportService } from '../configurations/configuration-import.service.js';
import { HealthController } from '../health/health.controller.js';

@Module({
  controllers: [HealthController],
  providers: [
    ApplicationEnvironmentService,
    DatabaseService,
    ApplicationShutdown,
    ConfigurationImportService,
  ],
})
export class ApplicationModule {
  static register(environment: ApplicationEnvironment): DynamicModule {
    return {
      module: ApplicationModule,
      providers: [{ provide: EnvironmentInjection.Values, useValue: { ...environment } }],
    };
  }
}
