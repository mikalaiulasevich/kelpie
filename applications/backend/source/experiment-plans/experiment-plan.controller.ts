import { Body, Controller, Get, Inject, Param, Put, Req, UseGuards } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { AdministrationGuard } from '../administration/administration.guard.js';
import { AdministrationService } from '../administration/administration.service.js';
import { ExperimentPlanPolicy } from './experiment-plan-policy.js';
import { ExperimentPlanService } from './experiment-plan.service.js';
@Controller(ExperimentPlanPolicy.Route)
@UseGuards(AdministrationGuard)
export class ExperimentPlanController {
  constructor(
    @Inject(ExperimentPlanService) private readonly plans: ExperimentPlanService,
    @Inject(AdministrationService) private readonly administration: AdministrationService,
  ) {}

  @Get(':versionIdentifier')
  read(@Param('versionIdentifier') identifier: unknown) {
    return this.plans.read(identifier);
  }

  @Put(':versionIdentifier')
  async save(
    @Param('versionIdentifier') identifier: unknown,
    @Body() input: unknown,
    @Req() request: FastifyRequest,
  ) {
    const administrator = await this.administration.authorize(request);

    return this.plans.save(identifier, input, administrator.identifier);
  }
}
