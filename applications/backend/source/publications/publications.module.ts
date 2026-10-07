import { Module } from '@nestjs/common';
import { AdministrationModule } from '../administration/administration.module.js';
import { DatabaseModule } from '../database/database.module.js';
import { PublicationController } from './publication.controller.js';
import { PublicationService } from './publication.service.js';
import { RollbackController } from './rollback.controller.js';

@Module({
  imports: [AdministrationModule, DatabaseModule],
  controllers: [PublicationController, RollbackController],
  providers: [PublicationService],
})
export class PublicationsModule {}
