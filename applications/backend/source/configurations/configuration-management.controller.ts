import { Body, Controller, Get, Inject, Post, Query, UseGuards } from '@nestjs/common';
import { AdministrationGuard } from '../administration/administration.guard.js';
import { ConfigurationImportPolicy } from './configuration-import-policy.js';
import type { ConfigurationList } from './configuration-management-types.js';
import type { ConfigurationImportResult } from './configuration-import-types.js';
import { ConfigurationManagementService } from './configuration-management.service.js';

@Controller(ConfigurationImportPolicy.ManagementRoute)
@UseGuards(AdministrationGuard)
export class ConfigurationManagementController {
  constructor(
    @Inject(ConfigurationManagementService)
    private readonly configurations: ConfigurationManagementService,
  ) {}

  @Get()
  list(@Query() query: unknown): Promise<ConfigurationList> {
    return this.configurations.list(query);
  }

  @Post()
  import(@Body() document: unknown): Promise<ConfigurationImportResult> {
    return this.configurations.import(document);
  }
}
