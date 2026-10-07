import type { PublicationResponse } from './publication-types.js';
import type { PublicationHistory } from './publication-types.js';
import { Body, Controller, Get, Inject, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { AdministrationGuard } from '../administration/administration.guard.js';
import { AdministrationService } from '../administration/administration.service.js';
import { PublicationPolicy } from './publication-policy.js';
import { PublicationService } from './publication.service.js';

@Controller(PublicationPolicy.Routes.Publications)
@UseGuards(AdministrationGuard)
export class PublicationController {
  constructor(
    @Inject(PublicationService) private readonly publications: PublicationService,
    @Inject(AdministrationService) private readonly administration: AdministrationService,
  ) {}

  @Get()
  history(@Query() query: unknown): Promise<PublicationHistory> {
    return this.publications.history(query);
  }

  @Post()
  async publish(
    @Body() document: unknown,
    @Req() request: FastifyRequest,
  ): Promise<PublicationResponse> {
    const administrator = await this.administration.authorize(request);

    return this.publications.publish(document, administrator.identifier);
  }
}
