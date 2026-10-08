import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { AdministrationController } from './administration.controller.js';
import { AdministrationGuard } from './administration.guard.js';
import { AdministrationBootstrapService } from './administration-bootstrap.service.js';
import { AdministrationService } from './administration.service.js';

@Module({
  imports: [DatabaseModule],
  controllers: [AdministrationController],
  providers: [AdministrationService, AdministrationGuard, AdministrationBootstrapService],
  exports: [AdministrationService, AdministrationGuard],
})
export class AdministrationModule {}
