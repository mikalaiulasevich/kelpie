import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Query,
  Req,
  Res,
} from '@nestjs/common';
import { RouteConfig } from '@nestjs/platform-fastify';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { SessionService } from './session.service.js';
import { SessionCommandsService } from './session-commands.service.js';
import { SessionHttpPolicy } from './session-http-policy.js';
import type { CurrentSessionResponse, SessionState } from './session-types.js';

@Controller(SessionHttpPolicy.Route)
export class SessionController {
  constructor(
    @Inject(SessionService) private readonly sessions: SessionService,
    @Inject(SessionCommandsService) private readonly commands: SessionCommandsService,
  ) {}

  @Get(SessionHttpPolicy.CurrentRoute)
  @RouteConfig({ rateLimit: SessionHttpPolicy.ReadRateLimit })
  current(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<CurrentSessionResponse> {
    return this.sessions.current(request, reply);
  }

  @Post()
  @RouteConfig({ rateLimit: SessionHttpPolicy.CreateRateLimit })
  create(
    @Req() request: FastifyRequest,
    @Res({ passthrough: true }) reply: FastifyReply,
    @Body() body: unknown,
    @Query() query: unknown,
  ): Promise<SessionState> {
    return this.sessions.create(request, reply, body, query);
  }

  @Post(SessionHttpPolicy.AnswersRoute)
  @HttpCode(HttpStatus.OK)
  @RouteConfig({ rateLimit: SessionHttpPolicy.CommandRateLimit })
  submit(@Req() request: FastifyRequest, @Body() body: unknown): Promise<SessionState> {
    return this.commands.submit(request, body);
  }

  @Post(SessionHttpPolicy.ContinueRoute)
  @HttpCode(HttpStatus.OK)
  @RouteConfig({ rateLimit: SessionHttpPolicy.CommandRateLimit })
  continue(@Req() request: FastifyRequest, @Body() body: unknown): Promise<SessionState> {
    return this.commands.continue(request, body);
  }

  @Post(SessionHttpPolicy.BackRoute)
  @HttpCode(HttpStatus.OK)
  @RouteConfig({ rateLimit: SessionHttpPolicy.CommandRateLimit })
  back(@Req() request: FastifyRequest, @Body() body: unknown): Promise<SessionState> {
    return this.commands.back(request, body);
  }
}
