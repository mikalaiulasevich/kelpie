import {
  Body,
  Controller,
  Get,
  HttpCode,
  Inject,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { RouteConfig } from '@nestjs/platform-fastify';
import type { FastifyRequest } from 'fastify';
import { AdministrationGuard } from '../administration/administration.guard.js';
import { AdministrationService } from '../administration/administration.service.js';
import { BusinessOutcomePolicy } from './business-outcome-policy.js';
import { BusinessOutcomeService } from './business-outcome.service.js';
@Controller(BusinessOutcomePolicy.Route)
@UseGuards(AdministrationGuard)
export class BusinessOutcomeController {
  constructor(
    @Inject(BusinessOutcomeService) private readonly outcomes: BusinessOutcomeService,
    @Inject(AdministrationService) private readonly administration: AdministrationService,
  ) {}

  @Post()
  @HttpCode(200)
  @RouteConfig({ rateLimit: BusinessOutcomePolicy.RateLimit })
  async record(@Body() input: unknown, @Req() request: FastifyRequest) {
    const administrator = await this.administration.authorize(request);

    return this.outcomes.record(input, administrator.identifier);
  }

  @Get()
  list(@Query() query: unknown) {
    return this.outcomes.list(query);
  }

  @Get('overview')
  overview(@Query() query: unknown) {
    return this.outcomes.overview(query);
  }
}
