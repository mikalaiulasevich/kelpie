import { Module } from '@nestjs/common';
import { AdministrationModule } from '../administration/administration.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { AnalyticsController } from './analytics.controller.js';
import { AnalyticsService } from './analytics.service.js';

@Module({
  imports: [AdministrationModule, DatabaseModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
})
export class AnalyticsModule {}
