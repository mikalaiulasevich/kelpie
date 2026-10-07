import type { AnalyticsSessionResponse } from './analytics-session-types.js';
import { Controller, Get, Inject, Query, UseGuards } from '@nestjs/common';
import { RouteConfig } from '@nestjs/platform-fastify';
import { AdministrationGuard } from '../administration/administration.guard.js';
import { AnalyticsPolicy } from './analytics-policy.js';
import type { AnalyticsResponse } from './analytics-response.js';
import { AnalyticsService } from './analytics.service.js';

@Controller(AnalyticsPolicy.Route)
@UseGuards(AdministrationGuard)
export class AnalyticsController {
  constructor(@Inject(AnalyticsService) private readonly analytics: AnalyticsService) {}

  @Get(AnalyticsPolicy.SessionsRoute)
  @RouteConfig({ rateLimit: AnalyticsPolicy.RateLimit })
  sessions(@Query() query: unknown): Promise<AnalyticsSessionResponse> {
    return this.analytics.sessions(query);
  }

  @Get()
  @RouteConfig({ rateLimit: AnalyticsPolicy.RateLimit })
  read(@Query() query: unknown): Promise<AnalyticsResponse> {
    return this.analytics.read(query);
  }
}
