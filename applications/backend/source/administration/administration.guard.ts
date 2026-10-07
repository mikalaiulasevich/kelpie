import { Inject, Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import type { FastifyRequest } from 'fastify';
import { AdministrationService } from './administration.service.js';
import { AdministrationPolicy } from './administration-policy.js';

@Injectable()
export class AdministrationGuard implements CanActivate {
  constructor(
    @Inject(AdministrationService) private readonly administration: AdministrationService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<FastifyRequest>();
    if (!AdministrationPolicy.ReadMethods.some((method) => method === request.method)) {
      this.administration.assertMutationOrigin(request);
    }

    await this.administration.authorize(request);

    return true;
  }
}
