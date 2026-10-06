import { Module } from '@nestjs/common';
import { DatabaseService } from './database/database.service.js';
import { ApplicationEnvironmentService } from './environment/application-environment.js';
import { HealthController } from './health/health.controller.js';

@Module({
  controllers: [HealthController],
  providers: [ApplicationEnvironmentService, DatabaseService],
})
export class ApplicationModule {}
