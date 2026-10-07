import { ConfigurationManagementController } from '../configurations/configuration-management.controller.js';
import { ConfigurationManagementService } from '../configurations/configuration-management.service.js';
import { PublicationController } from '../publications/publication.controller.js';
import { PublicationService } from '../publications/publication.service.js';
import { RollbackController } from '../publications/rollback.controller.js';
import { AdministrationController } from '../administration/administration.controller.js';
import { AdministrationGuard } from '../administration/administration.guard.js';
import { AdministrationService } from '../administration/administration.service.js';
import { Module, type DynamicModule } from '@nestjs/common';

import { ApplicationShutdown } from './application-shutdown.js';
import { DatabaseService } from '../database/database.service.js';
import { ApplicationEnvironmentService } from '../environment/application-environment.js';
import { EnvironmentInjection } from '../environment/environment-policy.js';
import type { ApplicationEnvironment } from '../environment/environment-schemas.js';
import { ConfigurationImportService } from '../configurations/configuration-import.service.js';
import { HealthController } from '../health/health.controller.js';

@Module({
  controllers: [HealthController, AdministrationController, ConfigurationManagementController, PublicationController, RollbackController],
  providers: [
    ConfigurationManagementService,
    PublicationService,
    AdministrationService,
    AdministrationGuard,
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
