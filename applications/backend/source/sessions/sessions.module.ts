import { AdministrationModule } from '../administration/administration.module.js';
import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { SessionCommandsService } from './session-commands.service.js';
import { SessionOwnershipService } from './session-ownership.service.js';
import { SessionController } from './session.controller.js';
import { SessionService } from './session.service.js';

@Module({
  imports: [DatabaseModule, AdministrationModule],
  controllers: [SessionController],
  providers: [SessionService, SessionOwnershipService, SessionCommandsService],
  exports: [SessionOwnershipService, SessionService],
})
export class SessionsModule {}
