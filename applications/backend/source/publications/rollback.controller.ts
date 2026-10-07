import { Body, Controller, Inject, Post, Req, UseGuards } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { AdministrationGuard } from '../administration/administration.guard.js';
import { AdministrationService } from '../administration/administration.service.js';
import { PublicationPolicy } from './publication-policy.js';
import { PublicationService } from './publication.service.js';

@Controller(PublicationPolicy.Routes.Rollbacks)
@UseGuards(AdministrationGuard)
export class RollbackController {
  constructor(
    @Inject(PublicationService) private readonly publications: PublicationService,
    @Inject(AdministrationService) private readonly administration: AdministrationService,
  ) {}

  @Post()
  async rollback(@Body() document: unknown, @Req() request: FastifyRequest) {
    const administrator = await this.administration.authorize(request);

    return this.publications.rollback(document, administrator.identifier);
  }
}
