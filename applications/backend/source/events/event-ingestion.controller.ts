import { Body, Controller, HttpCode, HttpStatus, Inject, Post, Req } from '@nestjs/common';
import { RouteConfig } from '@nestjs/platform-fastify';
import type { FastifyRequest } from 'fastify';
import { EventIngestionService } from './event-ingestion.service.js';
import { EventIngestionPolicy } from './event-ingestion-policy.js';
import type { EventBatchResponse } from './event-ingestion-types.js';

@Controller(EventIngestionPolicy.Route)
export class EventIngestionController {
  constructor(@Inject(EventIngestionService) private readonly events: EventIngestionService) {}

  @Post(EventIngestionPolicy.BatchRoute)
  @HttpCode(HttpStatus.OK)
  @RouteConfig({ rateLimit: EventIngestionPolicy.RateLimit })
  ingest(@Req() request: FastifyRequest, @Body() body: unknown): Promise<EventBatchResponse> {
    return this.events.ingest(request, body);
  }
}
