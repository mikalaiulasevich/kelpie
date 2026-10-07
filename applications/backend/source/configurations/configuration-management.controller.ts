import {
  Body,
  Controller,
  Get,
  Inject,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { AdministrationService } from '../administration/administration.service.js';
import { AdministrationGuard } from '../administration/administration.guard.js';
import { ConfigurationPreviewService } from './configuration-preview.service.js';
import { ConfigurationImportPolicy } from './configuration-import-policy.js';
import type {
  ConfigurationList,
  ConfigurationVersionDocument,
} from './configuration-management-types.js';
import type { ConfigurationImportResult } from './configuration-import-types.js';
import { ConfigurationManagementService } from './configuration-management.service.js';

@Controller(ConfigurationImportPolicy.ManagementRoute)
@UseGuards(AdministrationGuard)
export class ConfigurationManagementController {
  constructor(
    @Inject(ConfigurationManagementService)
    private readonly configurations: ConfigurationManagementService,
    @Inject(ConfigurationPreviewService) private readonly previews: ConfigurationPreviewService,
    @Inject(AdministrationService) private readonly administration: AdministrationService,
  ) {}

  @Get()
  list(@Query() query: unknown): Promise<ConfigurationList> {
    return this.configurations.list(query);
  }

  @Get(ConfigurationImportPolicy.VersionRoute)
  document(@Param('versionIdentifier') identifier: unknown): Promise<ConfigurationVersionDocument> {
    return this.configurations.document(identifier);
  }

  @Post(':versionIdentifier/preview')
  async preview(
    @Param('versionIdentifier') identifier: unknown,
    @Body() body: unknown,
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ) {
    const administrator = await this.administration.authorize(request);

    return this.previews.create(identifier, body, administrator.identifier, reply);
  }

  @Post()
  async import(
    @Body() document: unknown,
    @Req() request: FastifyRequest,
  ): Promise<ConfigurationImportResult> {
    const administrator = await this.administration.authorize(request);

    return this.configurations.import(document, administrator.username);
  }
}
