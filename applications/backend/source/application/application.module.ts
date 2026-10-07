import { ExperimentPlanModule } from '../experiment-plans/experiment-plan.module.js';
import { BusinessOutcomeModule } from '../business-outcomes/business-outcome.module.js';
import { Module, type DynamicModule } from '@nestjs/common';

import { AdministrationModule } from '../administration/administration.module.js';
import { AnalyticsModule } from '../analytics/analytics.module.js';
import { ConfigurationsModule } from '../configurations/configurations.module.js';
import { EnvironmentModule } from '../environment/environment.module.js';
import type { ApplicationEnvironment } from '../environment/environment-schemas.js';
import { EventsModule } from '../events/events.module.js';
import { HealthModule } from '../health/health.module.js';
import { PublicationsModule } from '../publications/publications.module.js';
import { SessionsModule } from '../sessions/sessions.module.js';
import { TransportModule } from '../transport/transport.module.js';
import { ApplicationShutdown } from './application-shutdown.js';

@Module({
  imports: [
    AdministrationModule,
    AnalyticsModule,
    BusinessOutcomeModule,
    ExperimentPlanModule,
    ConfigurationsModule,
    EventsModule,
    HealthModule,
    PublicationsModule,
    SessionsModule,
    TransportModule,
  ],
  providers: [ApplicationShutdown],
})
export class ApplicationModule {
  static register(environment: ApplicationEnvironment): DynamicModule {
    return {
      module: ApplicationModule,
      imports: [EnvironmentModule.register(environment)],
    };
  }
}
