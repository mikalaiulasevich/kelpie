import { Module } from '@nestjs/common';
import { DatabaseModule } from '../database/database.module.js';
import { SessionsModule } from '../sessions/sessions.module.js';
import { EventIngestionController } from './event-ingestion.controller.js';
import { EventIngestionService } from './event-ingestion.service.js';

@Module({
  imports: [DatabaseModule, SessionsModule],
  controllers: [EventIngestionController],
  providers: [EventIngestionService],
})
export class EventsModule {}
