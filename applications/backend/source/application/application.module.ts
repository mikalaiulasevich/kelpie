import { Module, type DynamicModule } from '@nestjs/common';
import { DatabaseService } from '../database/database.service.js';
import {
  ApplicationEnvironmentService,
  EnvironmentInjection,
} from '../environment/application-environment.js';
import type { ApplicationEnvironment } from '../environment/environment-schemas.js';
import { HealthController } from '../health/health.controller.js';

@Module({
  controllers: [HealthController],
  providers: [ApplicationEnvironmentService, DatabaseService],
})
export class ApplicationModule {
  static register(environment: ApplicationEnvironment): DynamicModule {
    return {
      module: ApplicationModule,
      providers: [{ provide: EnvironmentInjection.Values, useValue: { ...environment } }],
    };
  }
}
