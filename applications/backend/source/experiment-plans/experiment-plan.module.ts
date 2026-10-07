import { Module } from '@nestjs/common';
import { AdministrationModule } from '../administration/administration.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { ExperimentPlanController } from './experiment-plan.controller.js';
import { ExperimentPlanService } from './experiment-plan.service.js';
@Module({
  imports: [AdministrationModule, DatabaseModule],
  controllers: [ExperimentPlanController],
  providers: [ExperimentPlanService],
})
export class ExperimentPlanModule {}
