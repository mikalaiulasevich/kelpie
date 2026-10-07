import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { RouteConfig } from '@nestjs/platform-fastify';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { AdministrationService } from './administration.service.js';
import { AdministrationGuard } from './administration.guard.js';
import { AdministrationPolicy } from './administration-policy.js';
import type { AdministratorIdentity } from './administration-types.js';

@Controller(AdministrationPolicy.Route)
export class AdministrationController {
  constructor(
    @Inject(AdministrationService) private readonly administration: AdministrationService,
  ) {}

  @Post(AdministrationPolicy.SignInRoute)
  @HttpCode(HttpStatus.OK)
  @RouteConfig({ rateLimit: AdministrationPolicy.SignInRateLimit })
  signIn(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
    @Body() body: unknown,
  ): Promise<AdministratorIdentity> {
    return this.administration.signIn(request, reply, body);
  }

  @Post(AdministrationPolicy.SignOutRoute)
  @HttpCode(HttpStatus.NO_CONTENT)
  @UseGuards(AdministrationGuard)
  signOut(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<void> {
    return this.administration.signOut(request, reply);
  }

  @Get(AdministrationPolicy.SessionRoute)
  @UseGuards(AdministrationGuard)
  session(@Req() request: FastifyRequest): Promise<AdministratorIdentity> {
    return this.administration.authorize(request);
  }
}
