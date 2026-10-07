import { Body, Controller, Get, Inject, Post, Query, UseGuards } from '@nestjs/common';
import { AdministrationGuard } from '../administration/administration.guard.js';
import { PublicationPolicy } from '../publications/publication-policy.js';
import { ConfigurationManagementService } from './configuration-management.service.js';

@Controller(PublicationPolicy.Routes.Configurations)
@UseGuards(AdministrationGuard)
export class ConfigurationManagementController {
  constructor(
    @Inject(ConfigurationManagementService)
    private readonly configurations: ConfigurationManagementService,
  ) {}

  @Get()
  list(@Query() query: unknown) {
    return this.configurations.list(query);
  }

  @Post()
  import(@Body() document: unknown) {
    return this.configurations.import(document);
  }
}
