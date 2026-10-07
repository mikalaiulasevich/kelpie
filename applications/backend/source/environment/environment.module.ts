import { Module, type DynamicModule } from '@nestjs/common';

import { ApplicationEnvironmentService } from './application-environment.js';
import { EnvironmentInjection } from './environment-policy.js';
import type { ApplicationEnvironment } from './environment-schemas.js';

@Module({})
export class EnvironmentModule {
  static register(environment: ApplicationEnvironment): DynamicModule {
    return {
      module: EnvironmentModule,
      global: true,
      providers: [
        { provide: EnvironmentInjection.Values, useValue: { ...environment } },
        ApplicationEnvironmentService,
      ],
      exports: [ApplicationEnvironmentService],
    };
  }
}
