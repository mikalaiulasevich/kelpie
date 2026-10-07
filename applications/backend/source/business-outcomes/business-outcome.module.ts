import { Module } from '@nestjs/common';
import { AdministrationModule } from '../administration/administration.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { BusinessOutcomeController } from './business-outcome.controller.js';
import { BusinessOutcomeService } from './business-outcome.service.js';
@Module({
  imports: [AdministrationModule, DatabaseModule],
  controllers: [BusinessOutcomeController],
  providers: [BusinessOutcomeService],
})
export class BusinessOutcomeModule {}
