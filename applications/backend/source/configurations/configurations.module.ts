import { Module } from '@nestjs/common';
import { AdministrationModule } from '../administration/administration.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { ConfigurationImportService } from './configuration-import.service.js';
import { ConfigurationManagementController } from './configuration-management.controller.js';
import { ConfigurationManagementService } from './configuration-management.service.js';

@Module({
  imports: [AdministrationModule, DatabaseModule],
  controllers: [ConfigurationManagementController],
  providers: [ConfigurationImportService, ConfigurationManagementService],
  exports: [ConfigurationImportService],
})
export class ConfigurationsModule {}
